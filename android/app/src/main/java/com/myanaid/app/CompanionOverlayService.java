package com.myanaid.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONException;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

/**
 * An explicit, persistent Android-only companion surface. Android requires an
 * ongoing foreground notification for an app-owned overlay, which gives the
 * person a visible system control while the mascot is outside MyanAid.
 */
public class CompanionOverlayService extends Service {
    static final String ACTION_REFRESH = "com.myanaid.app.action.REFRESH_COMPANION";
    private static final String ACTION_OPEN = "com.myanaid.app.action.OPEN_COMPANION";
    // These action names are intentionally package-visible so rich safety
    // notifications can invoke the same, consented companion actions.
    static final String ACTION_OPEN_MAYA_CHAT = "com.myanaid.app.action.OPEN_MAYA_CHAT";
    static final String ACTION_LISTEN_COMPANION = "com.myanaid.app.action.LISTEN_COMPANION";
    static final String ACTION_MUTE_COMPANION_ALERTS = "com.myanaid.app.action.MUTE_COMPANION_ALERTS";
    static final String ACTION_OPEN_FORECAST = "com.myanaid.app.action.OPEN_FORECAST";
    static final String CRITICAL_ALERTS_MUTED_UNTIL = "critical_alerts_muted_until";
    private static final String ACTION_TOGGLE_AUDIO = "com.myanaid.app.action.TOGGLE_COMPANION_AUDIO";
    private static final String ACTION_TOGGLE_MOVEMENT = "com.myanaid.app.action.TOGGLE_COMPANION_MOVEMENT";
    private static final String ACTION_NOTIFICATION_SETTINGS = "com.myanaid.app.action.COMPANION_NOTIFICATION_SETTINGS";
    private static final String ACTION_CLOSE = "com.myanaid.app.action.CLOSE_COMPANION";
    private static final String CHANNEL_ID = "myanaid_companion";
    private static final int NOTIFICATION_ID = 4101;
    private static final String POSITION_X = "companion_overlay_x";
    private static final String POSITION_Y = "companion_overlay_y";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private ImageButton mascot;
    private WindowManager.LayoutParams mascotParams;
    private LinearLayout controls;
    private WindowManager.LayoutParams controlsParams;
    private Runnable hideControlsRunnable;
    private LinearLayout panel;
    private WindowManager.LayoutParams panelParams;
    private TextToSpeech textToSpeech;
    private boolean textToSpeechReady;
    private String pendingSpeech;
    private int bubbleSize;

    public static void startIfEnabled(Context context) {
        SharedPreferences preferences = MyanAidDevicePlugin.preferences(context);
        if (!preferences.getBoolean(MyanAidDevicePlugin.COMPANION, false) || !android.provider.Settings.canDrawOverlays(context)) return;

        Intent intent = new Intent(context, CompanionOverlayService.class).setAction(ACTION_REFRESH);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent);
            else context.startService(intent);
        } catch (RuntimeException ignored) {
            // Android can temporarily prohibit a background FGS start. The
            // next app resume or user preference save will try again.
        }
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, CompanionOverlayService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        bubbleSize = dp(68);
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!android.provider.Settings.canDrawOverlays(this) || !preferences().getBoolean(MyanAidDevicePlugin.COMPANION, false)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent == null ? ACTION_REFRESH : intent.getAction();
        if (ACTION_CLOSE.equals(action)) {
            // Closing from an operating-system surface is a real opt-out,
            // rather than silently restarting the overlay on the next update.
            preferences().edit().putBoolean(MyanAidDevicePlugin.COMPANION, false).apply();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_OPEN.equals(action)) openApp();
        if (ACTION_OPEN_MAYA_CHAT.equals(action)) openMayaChat();
        if (ACTION_LISTEN_COMPANION.equals(action)) listenToOutlook();
        if (ACTION_MUTE_COMPANION_ALERTS.equals(action)) muteCriticalAlerts();
        if (ACTION_OPEN_FORECAST.equals(action)) openForecast();
        if (ACTION_TOGGLE_AUDIO.equals(action)) {
            boolean next = !preferences().getBoolean(MyanAidDevicePlugin.AUDIO, false);
            preferences().edit().putBoolean(MyanAidDevicePlugin.AUDIO, next).apply();
        }
        if (ACTION_TOGGLE_MOVEMENT.equals(action)) {
            boolean next = !preferences().getBoolean(MyanAidDevicePlugin.COMPANION_MOVABLE, true);
            preferences().edit().putBoolean(MyanAidDevicePlugin.COMPANION_MOVABLE, next).apply();
        }
        if (ACTION_NOTIFICATION_SETTINGS.equals(action)) openNotificationSettings();

        startForeground(NOTIFICATION_ID, notification());
        if (mascot == null) addMascot();
        else refreshMascot();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        hideControls();
        hidePanel();
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        textToSpeech = null;
        textToSpeechReady = false;
        pendingSpeech = null;
        if (windowManager != null && mascot != null) {
            try {
                windowManager.removeView(mascot);
            } catch (IllegalArgumentException ignored) {
                // The system may have removed the overlay during teardown.
            }
        }
        mascot = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private SharedPreferences preferences() {
        return MyanAidDevicePlugin.preferences(this);
    }

    private void addMascot() {
        mascot = new ImageButton(this);
        mascot.setContentDescription(getString(R.string.app_name));
        mascot.setScaleType(ImageButton.ScaleType.CENTER_INSIDE);
        mascot.setPadding(dp(6), dp(6), dp(6), dp(6));
        mascot.setImageTintList(null);
        mascot.setBackground(roundBackground(0xF7FFFFFF, 0x8840C8E7, bubbleSize / 2));
        mascot.setOnTouchListener(new DragListener());
        refreshMascot();

        mascotParams = new WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        mascotParams.gravity = Gravity.TOP | Gravity.START;
        mascotParams.x = preferences().getInt(POSITION_X, dp(16));
        mascotParams.y = preferences().getInt(POSITION_Y, dp(144));
        clampToScreen(mascotParams);
        try {
            windowManager.addView(mascot, mascotParams);
        } catch (SecurityException ignored) {
            stopSelf();
        }
    }

    private void refreshMascot() {
        if (mascot == null) return;
        mascot.setImageResource(companionResource(preferences().getString(MyanAidDevicePlugin.COMPANION_ID, "maya")));
        if (controls != null) hideControls();
        if (panel != null) {
            hidePanel();
            showPanel();
        }
    }

    private int companionResource(String companionId) {
        if ("scout".equals(companionId)) return R.drawable.companion_scout;
        if ("nimbus".equals(companionId)) return R.drawable.companion_nimbus;
        if ("volt".equals(companionId)) return R.drawable.companion_volt;
        if ("sprout".equals(companionId)) return R.drawable.companion_sprout;
        if ("nova".equals(companionId)) return R.drawable.companion_nova;
        if ("iggy".equals(companionId)) return R.drawable.companion_iggy;
        if ("beacon".equals(companionId)) return R.drawable.companion_beacon;
        return R.drawable.companion_maya;
    }

    private Notification notification() {
        ensureNotificationChannel();
        Intent openIntent = new Intent(this, CompanionOverlayService.class).setAction(ACTION_OPEN);
        Intent soundIntent = new Intent(this, CompanionOverlayService.class).setAction(ACTION_TOGGLE_AUDIO);
        Intent closeIntent = new Intent(this, CompanionOverlayService.class).setAction(ACTION_CLOSE);
        PendingIntent open = serviceIntent(openIntent, 1);
        PendingIntent sound = serviceIntent(soundIntent, 2);
        PendingIntent close = serviceIntent(closeIntent, 3);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(notificationCondition())
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setContentIntent(open)
            // The actions intentionally use familiar iconography; all added
            // native visible copy is avoided so app translations stay in the
            // existing i18n source of truth.
            .addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_menu_view, "", open).build())
            .addAction(new NotificationCompat.Action.Builder(audioIcon(), "", sound).build())
            .addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, "", close).build());
        return builder.build();
    }

    private PendingIntent serviceIntent(Intent intent, int requestCode) {
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, getString(R.string.app_name), NotificationManager.IMPORTANCE_LOW);
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private String notificationCondition() {
        String fallback = preferences().getString(MyanAidDevicePlugin.COMPANION_NAME, getString(R.string.app_name));
        String stored = preferences().getString(MyanAidDevicePlugin.REMINDER, "");
        if (stored == null || stored.isEmpty()) return fallback;
        try {
            JSONObject reminder = new JSONObject(stored);
            String condition = reminder.optString("currentCondition", "").trim();
            if (!condition.isEmpty()) return condition;
            String text = reminder.optString("text", "").trim();
            return text.isEmpty() ? fallback : text;
        } catch (JSONException ignored) {
            return fallback;
        }
    }

    private JSONObject outlook() {
        String stored = preferences().getString(MyanAidDevicePlugin.REMINDER, "");
        if (stored == null || stored.isEmpty()) return null;
        try {
            return new JSONObject(stored);
        } catch (JSONException ignored) {
            return null;
        }
    }

    private String primaryRecommendation() {
        JSONObject reminder = outlook();
        if (reminder == null) return notificationCondition();
        JSONArray actions = reminder.optJSONArray("recommendedActions");
        if (actions != null) {
            for (int index = 0; index < actions.length(); index += 1) {
                String action = actions.optString(index, "").trim();
                if (!action.isEmpty()) return action;
            }
        }
        String fallback = reminder.optString("text", "").trim();
        return fallback.isEmpty() ? notificationCondition() : fallback;
    }

    private String companionName() {
        return preferences().getString(MyanAidDevicePlugin.COMPANION_NAME, getString(R.string.app_name));
    }

    private void togglePanel() {
        if (panel == null) showPanel();
        else hidePanel();
    }

    /**
     * Creates an intentionally compact, non-focus-stealing overlay. It offers
     * a weather safety check without taking the person away from whatever they
     * are doing; the native Bubble API owns the focused chat experience.
     */
    private void showPanel() {
        if (mascot == null || panel != null) return;
        hideControls();

        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int panelWidth = Math.max(dp(1), Math.min(dp(336), screenWidth - dp(16)));
        panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(14), dp(12), dp(14), dp(12));
        panel.setElevation(dp(12));
        panel.setBackground(roundBackground(0xFCF8FDFF, 0x9938CFE8, dp(24)));

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        ImageView avatar = new ImageView(this);
        avatar.setImageResource(companionResource(preferences().getString(MyanAidDevicePlugin.COMPANION_ID, "maya")));
        avatar.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        avatar.setPadding(dp(3), dp(3), dp(3), dp(3));
        avatar.setBackground(roundBackground(0xE8FFFFFF, 0x5538CFE8, dp(16)));
        header.addView(avatar, new LinearLayout.LayoutParams(dp(48), dp(48)));

        TextView name = panelText(companionName(), 18, Color.rgb(13, 42, 60), true);
        name.setSingleLine(true);
        name.setEllipsize(TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        nameParams.setMargins(dp(10), 0, dp(4), 0);
        header.addView(name, nameParams);

        ImageButton collapse = new ImageButton(this);
        collapse.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
        collapse.setImageTintList(null);
        collapse.setContentDescription(getString(R.string.app_name));
        collapse.setPadding(dp(8), dp(8), dp(8), dp(8));
        collapse.setBackgroundColor(Color.TRANSPARENT);
        collapse.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { hidePanel(); }
        });
        header.addView(collapse, new LinearLayout.LayoutParams(dp(40), dp(40)));
        panel.addView(header, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        TextView condition = panelText(notificationCondition(), 14, Color.rgb(44, 70, 82), false);
        condition.setGravity(Gravity.CENTER_VERTICAL);
        condition.setMaxLines(2);
        condition.setEllipsize(TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams conditionParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(42));
        conditionParams.setMargins(0, dp(6), 0, 0);
        panel.addView(condition, conditionParams);

        LinearLayout recommendation = new LinearLayout(this);
        recommendation.setOrientation(LinearLayout.HORIZONTAL);
        recommendation.setGravity(Gravity.CENTER_VERTICAL);
        recommendation.setPadding(dp(9), dp(5), dp(9), dp(5));
        recommendation.setBackground(roundBackground(0xEAF0FAFF, 0x5538CFE8, dp(16)));
        ImageView recommendationIcon = new ImageView(this);
        recommendationIcon.setImageResource(android.R.drawable.ic_dialog_info);
        recommendationIcon.setImageTintList(null);
        recommendation.addView(recommendationIcon, new LinearLayout.LayoutParams(dp(22), dp(22)));
        TextView recommendationText = panelText(primaryRecommendation(), 13, Color.rgb(15, 49, 70), true);
        recommendationText.setMaxLines(2);
        recommendationText.setEllipsize(TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams recommendationTextParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        recommendationTextParams.setMargins(dp(7), 0, 0, 0);
        recommendation.addView(recommendationText, recommendationTextParams);
        LinearLayout.LayoutParams recommendationParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        recommendationParams.setMargins(0, dp(7), 0, 0);
        panel.addView(recommendation, recommendationParams);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER);
        actions.addView(panelAction("Ask Maya", 0xFF087FC1, 0xFFFFFFFF, new View.OnClickListener() {
            @Override public void onClick(View view) { openMayaChat(); }
        }));
        actions.addView(panelAction("Listen", 0xFFE7F7FC, 0xFF075D8B, new View.OnClickListener() {
            @Override public void onClick(View view) { listenToOutlook(); }
        }));
        actions.addView(panelAction("Mute 2h", 0xFFFFF3E2, 0xFF9A5A00, new View.OnClickListener() {
            @Override public void onClick(View view) { muteCriticalAlerts(); }
        }));
        actions.addView(panelAction("Forecast", 0xFFF0F5F8, 0xFF244E65, new View.OnClickListener() {
            @Override public void onClick(View view) { openForecast(); }
        }));
        LinearLayout.LayoutParams actionsParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(38));
        actionsParams.setMargins(0, dp(9), 0, 0);
        panel.addView(actions, actionsParams);

        panelParams = new WindowManager.LayoutParams(
            panelWidth,
            dp(226),
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        panelParams.gravity = Gravity.TOP | Gravity.START;
        positionPanel();
        try {
            windowManager.addView(panel, panelParams);
        } catch (SecurityException ignored) {
            panel = null;
            panelParams = null;
        }
    }

    private TextView panelAction(String label, int background, int textColor, View.OnClickListener listener) {
        TextView button = panelText(label, 10, textColor, true);
        button.setGravity(Gravity.CENTER);
        button.setSingleLine(true);
        button.setEllipsize(TextUtils.TruncateAt.END);
        button.setContentDescription(label);
        button.setBackground(roundBackground(background, 0x2238CFE8, dp(12)));
        button.setOnClickListener(listener);
        button.setClickable(true);
        button.setFocusable(true);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        params.setMargins(dp(2), 0, dp(2), 0);
        button.setLayoutParams(params);
        return button;
    }

    private TextView panelText(String text, int textSize, int textColor, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextColor(textColor);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, textSize);
        view.setIncludeFontPadding(false);
        if (bold) view.setTypeface(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD);
        return view;
    }

    private void hidePanel() {
        if (windowManager != null && panel != null) {
            try {
                windowManager.removeView(panel);
            } catch (IllegalArgumentException ignored) {
                // Already detached while Android tears down the overlay.
            }
        }
        panel = null;
        panelParams = null;
    }

    private void positionPanel() {
        if (panelParams == null || mascotParams == null) return;
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        int proposedX = mascotParams.x + bubbleSize + dp(8);
        if (proposedX + panelParams.width > screenWidth - dp(8)) {
            proposedX = mascotParams.x - panelParams.width - dp(8);
        }
        panelParams.x = proposedX;
        panelParams.y = mascotParams.y - dp(4);
        clampToScreen(panelParams);
    }

    private void openMayaChat() {
        hidePanel();
        try {
            MayaChatBubbleManager.show(this);
        } catch (RuntimeException ignored) {
            // The chat manager has an in-app fallback, but preserve a usable
            // escape hatch if a device rejects bubbles at runtime.
            openApp(ACTION_OPEN_MAYA_CHAT);
        }
    }

    private void openForecast() {
        hidePanel();
        MayaSafetyNotificationManager.openForecast(this);
    }

    private void muteCriticalAlerts() {
        MayaSafetyNotificationManager.muteForTwoHours(this);
        startForeground(NOTIFICATION_ID, notification());
        hidePanel();
    }

    private void listenToOutlook() {
        hidePanel();
        String words = companionName() + ". " + notificationCondition() + ". " + primaryRecommendation();
        pendingSpeech = words;
        if (textToSpeech == null) {
            textToSpeech = new TextToSpeech(getApplicationContext(), new TextToSpeech.OnInitListener() {
                @Override public void onInit(int status) {
                    if (status != TextToSpeech.SUCCESS || textToSpeech == null) return;
                    textToSpeechReady = true;
                    Locale locale = Locale.getDefault();
                    if (textToSpeech.isLanguageAvailable(locale) >= TextToSpeech.LANG_AVAILABLE) {
                        textToSpeech.setLanguage(locale);
                    }
                    speakPendingOutlook();
                }
            });
            return;
        }
        speakPendingOutlook();
    }

    private void speakPendingOutlook() {
        if (!textToSpeechReady || textToSpeech == null || pendingSpeech == null || pendingSpeech.isEmpty()) return;
        String words = pendingSpeech;
        pendingSpeech = null;
        textToSpeech.speak(words, TextToSpeech.QUEUE_FLUSH, null, "myanaid_outlook");
    }

    private void openApp() {
        openApp(null);
    }

    private void openApp(String requestedAction) {
        hideControls();
        hidePanel();
        Intent openApp = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (requestedAction != null) openApp.setAction(requestedAction);
        startActivity(openApp);
    }

    private void showControls() {
        if (mascot == null || controls != null) return;
        hidePanel();
        controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setGravity(Gravity.CENTER);
        controls.setPadding(dp(6), dp(6), dp(6), dp(6));
        controls.setBackground(roundBackground(0xF7FFFFFF, 0x6638CFE8, dp(22)));
        controls.addView(controlButton(android.R.drawable.ic_menu_view, new View.OnClickListener() {
            @Override public void onClick(View view) { openApp(); }
        }));
        controls.addView(controlButton(audioIcon(), new View.OnClickListener() {
            @Override public void onClick(View view) {
                boolean next = !preferences().getBoolean(MyanAidDevicePlugin.AUDIO, false);
                preferences().edit().putBoolean(MyanAidDevicePlugin.AUDIO, next).apply();
                startForeground(NOTIFICATION_ID, notification());
                hideControls();
            }
        }));
        controls.addView(controlButton(movementIcon(), new View.OnClickListener() {
            @Override public void onClick(View view) {
                boolean next = !preferences().getBoolean(MyanAidDevicePlugin.COMPANION_MOVABLE, true);
                preferences().edit().putBoolean(MyanAidDevicePlugin.COMPANION_MOVABLE, next).apply();
                hideControls();
            }
        }));
        controls.addView(controlButton(android.R.drawable.ic_dialog_email, new View.OnClickListener() {
            @Override public void onClick(View view) { openNotificationSettings(); }
        }));
        controls.addView(controlButton(android.R.drawable.ic_menu_close_clear_cancel, new View.OnClickListener() {
            @Override public void onClick(View view) {
                preferences().edit().putBoolean(MyanAidDevicePlugin.COMPANION, false).apply();
                stopSelf();
            }
        }));

        controlsParams = new WindowManager.LayoutParams(
            dp(232),
            dp(52),
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        controlsParams.gravity = Gravity.TOP | Gravity.START;
        positionControls();
        try {
            windowManager.addView(controls, controlsParams);
        } catch (SecurityException ignored) {
            controls = null;
            return;
        }
        hideControlsRunnable = new Runnable() {
            @Override public void run() { hideControls(); }
        };
        mainHandler.postDelayed(hideControlsRunnable, 6000);
    }

    private void hideControls() {
        if (hideControlsRunnable != null) mainHandler.removeCallbacks(hideControlsRunnable);
        hideControlsRunnable = null;
        if (windowManager != null && controls != null) {
            try {
                windowManager.removeView(controls);
            } catch (IllegalArgumentException ignored) {
                // Already removed during system teardown.
            }
        }
        controls = null;
        controlsParams = null;
    }

    private ImageButton controlButton(int icon, View.OnClickListener listener) {
        ImageButton button = new ImageButton(this);
        button.setImageResource(icon);
        button.setImageTintList(null);
        button.setContentDescription(getString(R.string.app_name));
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setOnClickListener(listener);
        button.setPadding(dp(9), dp(9), dp(9), dp(9));
        button.setLayoutParams(new LinearLayout.LayoutParams(dp(44), dp(40)));
        return button;
    }

    private int audioIcon() {
        return preferences().getBoolean(MyanAidDevicePlugin.AUDIO, false)
            ? android.R.drawable.ic_btn_speak_now
            : android.R.drawable.ic_lock_silent_mode;
    }

    private int movementIcon() {
        return preferences().getBoolean(MyanAidDevicePlugin.COMPANION_MOVABLE, true)
            ? android.R.drawable.ic_menu_mylocation
            : android.R.drawable.ic_lock_lock;
    }

    private void positionControls() {
        if (controlsParams == null || mascotParams == null) return;
        controlsParams.x = Math.max(dp(8), mascotParams.x - (controlsParams.width - bubbleSize) / 2);
        controlsParams.y = mascotParams.y + bubbleSize + dp(8);
        clampToScreen(controlsParams);
    }

    private void openNotificationSettings() {
        hideControls();
        Intent notificationSettings = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            startActivity(notificationSettings);
        } catch (RuntimeException ignored) {
            // The foreground service remains available even when Settings
            // cannot be opened by a device manufacturer.
        }
    }

    private void clampToScreen(WindowManager.LayoutParams params) {
        int width = getResources().getDisplayMetrics().widthPixels;
        int height = getResources().getDisplayMetrics().heightPixels;
        params.x = Math.max(0, Math.min(params.x, Math.max(0, width - params.width)));
        params.y = Math.max(0, Math.min(params.y, Math.max(0, height - params.height)));
    }

    private int overlayWindowType() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
    }

    private GradientDrawable roundBackground(int color, int strokeColor, int cornerRadius) {
        GradientDrawable background = new GradientDrawable();
        background.setColor(color);
        background.setCornerRadius(cornerRadius);
        background.setStroke(dp(1), strokeColor);
        return background;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class DragListener implements View.OnTouchListener {
        private final int touchSlop = dp(8);
        private int initialX;
        private int initialY;
        private float initialTouchX;
        private float initialTouchY;
        private boolean moved;
        private boolean longPressed;
        private Runnable longPressRunnable;

        @Override
        public boolean onTouch(final View view, MotionEvent event) {
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    initialX = mascotParams.x;
                    initialY = mascotParams.y;
                    initialTouchX = event.getRawX();
                    initialTouchY = event.getRawY();
                    moved = false;
                    longPressed = false;
                    longPressRunnable = new Runnable() {
                        @Override public void run() {
                            longPressed = true;
                            showControls();
                        }
                    };
                    mainHandler.postDelayed(longPressRunnable, android.view.ViewConfiguration.getLongPressTimeout());
                    return true;
                case MotionEvent.ACTION_MOVE:
                    float deltaX = event.getRawX() - initialTouchX;
                    float deltaY = event.getRawY() - initialTouchY;
                    if (!moved && Math.hypot(deltaX, deltaY) > touchSlop) {
                        moved = true;
                        if (longPressRunnable != null) mainHandler.removeCallbacks(longPressRunnable);
                        hideControls();
                        hidePanel();
                    }
                    if (moved && preferences().getBoolean(MyanAidDevicePlugin.COMPANION_MOVABLE, true)) {
                        mascotParams.x = initialX + Math.round(deltaX);
                        mascotParams.y = initialY + Math.round(deltaY);
                        clampToScreen(mascotParams);
                        windowManager.updateViewLayout(mascot, mascotParams);
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    if (longPressRunnable != null) mainHandler.removeCallbacks(longPressRunnable);
                    if (moved && preferences().getBoolean(MyanAidDevicePlugin.COMPANION_MOVABLE, true)) {
                        preferences().edit()
                            .putInt(POSITION_X, mascotParams.x)
                            .putInt(POSITION_Y, mascotParams.y)
                            .apply();
                    } else if (!longPressed && event.getActionMasked() == MotionEvent.ACTION_UP) {
                        view.performClick();
                        togglePanel();
                    }
                    return true;
                default:
                    return false;
            }
        }
    }
}
