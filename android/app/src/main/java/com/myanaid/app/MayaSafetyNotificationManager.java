package com.myanaid.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.text.TextUtils;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.IconCompat;

/**
 * Posts a consented, actionable weather-attention notification when the
 * source-backed outlook reaches MyanAid's elevated level. This is deliberately
 * separate from the foreground-service notification: it can be dismissed,
 * muted, and handled even when the floating companion is switched off.
 */
public final class MayaSafetyNotificationManager {
    static final String CHANNEL_ID = "myanaid_weather_attention";
    static final int NOTIFICATION_ID = 4105;

    private static final String LAST_FINGERPRINT = "critical_alert_last_fingerprint";
    private static final String LAST_POSTED_AT = "critical_alert_last_posted_at";
    private static final long REPEAT_ALERT_AFTER_MILLIS = 2L * 60L * 60L * 1000L;

    private MayaSafetyNotificationManager() {
        // Static-only utility.
    }

    /** Called whenever the web app persists a fresh source-backed outlook. */
    public static void refreshForStoredOutlook(Context context) {
        if (context == null) return;
        Context appContext = context.getApplicationContext();
        SharedPreferences preferences = MyanAidDevicePlugin.preferences(appContext);
        MayaChatBubbleManager.Outlook outlook = MayaChatBubbleManager.outlook(appContext);

        if (!preferences.getBoolean(MyanAidDevicePlugin.NOTIFICATIONS, false) || !isElevated(outlook)) {
            clear(appContext, true);
            return;
        }

        long mutedUntil = preferences.getLong(CompanionOverlayService.CRITICAL_ALERTS_MUTED_UNTIL, 0L);
        if (mutedUntil > System.currentTimeMillis() || !canPostNotifications(appContext)) {
            NotificationManagerCompat.from(appContext).cancel(NOTIFICATION_ID);
            return;
        }

        ensureChannel(appContext);
        String fingerprint = fingerprint(outlook);
        long now = System.currentTimeMillis();
        boolean alreadyAlerted = fingerprint.equals(preferences.getString(LAST_FINGERPRINT, ""))
            && now - preferences.getLong(LAST_POSTED_AT, 0L) < REPEAT_ALERT_AFTER_MILLIS;

        post(appContext, outlook, alreadyAlerted);
        preferences.edit()
            .putString(LAST_FINGERPRINT, fingerprint)
            .putLong(LAST_POSTED_AT, now)
            .apply();
    }

    /** Mutes future elevated-weather prompts for two hours from an explicit action. */
    public static void muteForTwoHours(Context context) {
        if (context == null) return;
        Context appContext = context.getApplicationContext();
        MyanAidDevicePlugin.preferences(appContext).edit()
            .putLong(CompanionOverlayService.CRITICAL_ALERTS_MUTED_UNTIL, System.currentTimeMillis() + REPEAT_ALERT_AFTER_MILLIS)
            .remove(LAST_FINGERPRINT)
            .remove(LAST_POSTED_AT)
            .apply();
        NotificationManagerCompat.from(appContext).cancel(NOTIFICATION_ID);
    }

    /** Clears the independently-dismissible safety alert when the person opts out. */
    public static void clear(Context context) {
        clear(context, false);
    }

    private static void clear(Context context, boolean resetDeliveryState) {
        if (context == null) return;
        Context appContext = context.getApplicationContext();
        NotificationManagerCompat.from(appContext).cancel(NOTIFICATION_ID);
        if (resetDeliveryState) {
            MyanAidDevicePlugin.preferences(appContext).edit()
                .remove(LAST_FINGERPRINT)
                .remove(LAST_POSTED_AT)
                .apply();
        }
    }

    public static void openForecast(Context context) {
        if (context == null) return;
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("com.myanaid.app://outlook"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        try {
            context.startActivity(intent);
        } catch (RuntimeException ignored) {
            // A notification action must never crash the app if an OEM blocks
            // an activity launch while the device is changing state.
        }
    }

    private static boolean isElevated(MayaChatBubbleManager.Outlook outlook) {
        return outlook != null && "elevated".equalsIgnoreCase(outlook.level);
    }

    private static boolean canPostNotifications(Context context) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
        if (existing != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.weather_attention_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setShowBadge(true);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0L, 220L, 120L, 220L });
        manager.createNotificationChannel(channel);
    }

    private static void post(Context context, MayaChatBubbleManager.Outlook outlook, boolean onlyAlertOnce) {
        Person companion = new Person.Builder()
            .setName(outlook.companionName)
            .setBot(true)
            .setImportant(true)
            .setIcon(IconCompat.createWithResource(context, MayaChatBubbleManager.companionResource(outlook.companionId)))
            .build();

        String condition = firstNonEmpty(outlook.currentCondition, outlook.forecastSummary, context.getString(R.string.weather_attention_fallback));
        String recommendation = firstNonEmpty(outlook.recommendedAction, context.getString(R.string.weather_attention_recommendation_fallback));
        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(companion)
            .setConversationTitle(outlook.companionName)
            .addMessage(trim(condition, 240), System.currentTimeMillis(), companion)
            .addMessage(trim(recommendation, 240), System.currentTimeMillis(), companion);

        PendingIntent listen = actionIntent(context, CompanionOverlayService.ACTION_LISTEN_COMPANION, 4111);
        PendingIntent askMaya = actionIntent(context, CompanionOverlayService.ACTION_OPEN_MAYA_CHAT, 4112);
        PendingIntent mute = actionIntent(context, CompanionOverlayService.ACTION_MUTE_COMPANION_ALERTS, 4113);
        PendingIntent forecast = forecastIntent(context);

        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), MayaChatBubbleManager.companionResource(outlook.companionId)))
            .setColor(0xFF087EBA)
            .setContentTitle(outlook.companionName)
            .setContentText(trim(recommendation, 120))
            .setSubText(trim(outlook.location, 80))
            .setStyle(style)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setAutoCancel(true)
            .setOnlyAlertOnce(onlyAlertOnce)
            .setContentIntent(forecast)
            .addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_btn_speak_now, context.getString(R.string.notification_action_listen), listen)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_NONE)
                .build())
            .addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_dialog_info, context.getString(R.string.notification_action_ask_maya), askMaya)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY)
                .build())
            .addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_lock_silent_mode, context.getString(R.string.notification_action_mute_two_hours), mute)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_MUTE)
                .build())
            .addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_menu_compass, context.getString(R.string.notification_action_open_forecast), forecast)
                .setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_NONE)
                .build());

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification.build());
        } catch (SecurityException ignored) {
            // Permission can change between the preflight check and notify.
        }
    }

    private static PendingIntent actionIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, MayaSafetyNotificationActionReceiver.class)
            .setAction(action)
            .setPackage(context.getPackageName());
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static PendingIntent forecastIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(Uri.parse("com.myanaid.app://outlook"))
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            4114,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static String fingerprint(MayaChatBubbleManager.Outlook outlook) {
        return outlook.level + "|" + outlook.score + "|" + outlook.currentCondition + "|" + outlook.recommendedAction;
    }

    private static String firstNonEmpty(String... values) {
        for (String value : values) {
            if (!TextUtils.isEmpty(value) && !TextUtils.isEmpty(value.trim())) return value.trim();
        }
        return "";
    }

    private static String trim(String value, int maximumLength) {
        if (value == null) return "";
        String clean = value.trim();
        return clean.length() <= maximumLength ? clean : clean.substring(0, Math.max(0, maximumLength - 1)).trim() + "…";
    }
}
