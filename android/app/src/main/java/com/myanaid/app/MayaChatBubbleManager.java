package com.myanaid.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.text.TextUtils;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.app.Person;
import androidx.core.content.ContextCompat;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Owns MyanAid's single, user-initiated conversation bubble.
 *
 * <p>The chat lives entirely in Android system surfaces. It intentionally
 * uses the locally persisted outlook rather than attempting to call an AI
 * provider from an always-on Android component. That keeps the bubble useful
 * when the main WebView is not running, while remaining clear that detailed
 * assistance belongs to the full MyanAid experience.</p>
 */
public final class MayaChatBubbleManager {
    public static final String ACTION_OPEN_MAYA_CHAT = "com.myanaid.app.action.OPEN_MAYA_CHAT";

    private static final String CHANNEL_ID = "myanaid_maya_chat";
    private static final String SHORTCUT_ID = "myanaid_maya_chat";
    private static final int NOTIFICATION_ID = 4104;
    private static final int BUBBLE_REQUEST_CODE = 4104;
    private static final String CHAT_HISTORY = "maya_native_chat_history";
    private static final int MAX_STORED_MESSAGES = 18;
    private static final int MAX_NOTIFICATION_MESSAGES = 6;

    private MayaChatBubbleManager() {
        // Static-only utility.
    }

    /**
     * Opens MyanAid's conversation as an Android Bubble where the platform
     * supports it. If notifications or Bubbles are disabled by the person,
     * the same compact native chat activity remains available as a fallback.
     */
    public static void show(Context context) {
        if (context == null) return;
        Context appContext = context.getApplicationContext();
        ensureInitialAssistantMessage(appContext);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || !canPostNotifications(appContext)) {
            openActivity(appContext);
            return;
        }

        ensureConversationShortcut(appContext);
        ensureNotificationChannel(appContext);
        postBubble(appContext, true);
    }

    /** Opens the same compact system surface and starts spoken playback. */
    public static void openForSpeech(Context context) {
        if (context == null) return;
        Context appContext = context.getApplicationContext();
        ensureInitialAssistantMessage(appContext);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && canPostNotifications(appContext)) {
            ensureConversationShortcut(appContext);
            ensureNotificationChannel(appContext);
            postBubble(appContext, true, true);
            return;
        }
        openActivity(appContext, true);
    }

    /**
     * Updates the existing conversation notification without launching the
     * full app. It is used after a message is sent from the expanded bubble.
     */
    public static void refresh(Context context) {
        if (context == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        Context appContext = context.getApplicationContext();
        if (!canPostNotifications(appContext)) return;
        ensureConversationShortcut(appContext);
        ensureNotificationChannel(appContext);
        postBubble(appContext, false);
    }

    public static void appendUserMessage(Context context, String text) {
        appendMessage(context, ChatMessage.USER, text);
    }

    public static void appendAssistantMessage(Context context, String text) {
        appendMessage(context, ChatMessage.ASSISTANT, text);
    }

    public static List<ChatMessage> messages(Context context) {
        if (context == null) return Collections.emptyList();
        List<ChatMessage> messages = readMessages(context.getApplicationContext());
        if (messages.isEmpty()) {
            messages.add(new ChatMessage(ChatMessage.ASSISTANT, outlook(context).initialMessage(), System.currentTimeMillis()));
        }
        return messages;
    }

    /**
     * A deliberately transparent local reply: native Android code does not
     * impersonate an online model or transmit the person's message silently.
     */
    public static String localReply(Context context) {
        Outlook outlook = outlook(context);
        String action = outlook.recommendedAction;
        if (TextUtils.isEmpty(action)) action = "Review the latest safety outlook in MyanAid when you can.";
        return "I can keep this latest safety recommendation visible here: " + action
            + " For a detailed response, open MyanAid when you are ready.";
    }

    static Outlook outlook(Context context) {
        SharedPreferences preferences = MyanAidDevicePlugin.preferences(context);
        String companionId = preferences.getString(MyanAidDevicePlugin.COMPANION_ID, "maya");
        String companionName = preferences.getString(MyanAidDevicePlugin.COMPANION_NAME, "Maya");
        String stored = preferences.getString(MyanAidDevicePlugin.REMINDER, "");

        Outlook outlook = new Outlook(
            companionId == null ? "maya" : companionId,
            TextUtils.isEmpty(companionName) ? "Maya" : companionName
        );
        if (TextUtils.isEmpty(stored)) return outlook;

        try {
            JSONObject reminder = new JSONObject(stored);
            outlook.location = reminder.optString("location", "").trim();
            outlook.currentCondition = reminder.optString("currentCondition", "").trim();
            outlook.forecastSummary = reminder.optString("forecastSummary", "").trim();
            outlook.level = reminder.optString("level", "").trim();
            outlook.score = reminder.optInt("score", -1);
            JSONArray actions = reminder.optJSONArray("recommendedActions");
            if (actions != null) {
                for (int index = 0; index < actions.length(); index++) {
                    String action = actions.optString(index, "").trim();
                    if (!action.isEmpty()) {
                        outlook.recommendedAction = action;
                        break;
                    }
                }
            }
            if (TextUtils.isEmpty(outlook.recommendedAction)) {
                outlook.recommendedAction = reminder.optString("text", "").trim();
            }
        } catch (JSONException ignored) {
            // A malformed payload should never prevent a person from opening
            // the compact chat shell or accessing their own message history.
        }
        return outlook;
    }

    static int companionResource(String companionId) {
        if ("scout".equals(companionId)) return R.drawable.companion_scout;
        if ("nimbus".equals(companionId)) return R.drawable.companion_nimbus;
        if ("volt".equals(companionId)) return R.drawable.companion_volt;
        if ("sprout".equals(companionId)) return R.drawable.companion_sprout;
        if ("nova".equals(companionId)) return R.drawable.companion_nova;
        if ("iggy".equals(companionId)) return R.drawable.companion_iggy;
        if ("beacon".equals(companionId)) return R.drawable.companion_beacon;
        return R.drawable.companion_maya;
    }

    private static void openActivity(Context context) {
        openActivity(context, false);
    }

    private static void openActivity(Context context, boolean speakOutlook) {
        Intent intent = new Intent(context, MayaBubbleActivity.class)
            .setAction(ACTION_OPEN_MAYA_CHAT)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (speakOutlook) intent.putExtra(MayaBubbleActivity.EXTRA_SPEAK_OUTLOOK, true);
        try {
            context.startActivity(intent);
        } catch (RuntimeException ignored) {
            // The foreground overlay remains available if an OEM prevents
            // launching an activity from a background system surface.
        }
    }

    private static boolean canPostNotifications(Context context) {
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false;
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
        if (existing != null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.app_name),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setShowBadge(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) channel.setAllowBubbles(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            channel.setConversationId(CHANNEL_ID, SHORTCUT_ID);
        }
        manager.createNotificationChannel(channel);
    }

    private static void ensureConversationShortcut(Context context) {
        Outlook outlook = outlook(context);
        Person companion = companionPerson(context, outlook);
        ShortcutInfoCompat shortcut = new ShortcutInfoCompat.Builder(context, SHORTCUT_ID)
            .setShortLabel(outlook.companionName)
            .setLongLived(true)
            .setIcon(IconCompat.createWithResource(context, companionResource(outlook.companionId)))
            .setIntent(new Intent(context, MayaBubbleActivity.class).setAction(ACTION_OPEN_MAYA_CHAT))
            .setPerson(companion)
            .build();
        ShortcutManagerCompat.pushDynamicShortcut(context, shortcut);
    }

    private static void postBubble(Context context, boolean autoExpand) {
        postBubble(context, autoExpand, false);
    }

    private static void postBubble(Context context, boolean autoExpand, boolean speakOutlook) {
        Outlook outlook = outlook(context);
        Person companion = companionPerson(context, outlook);
        Intent bubbleActivityIntent = new Intent(context, MayaBubbleActivity.class).setAction(ACTION_OPEN_MAYA_CHAT);
        if (speakOutlook) bubbleActivityIntent.putExtra(MayaBubbleActivity.EXTRA_SPEAK_OUTLOOK, true);
        PendingIntent bubbleIntent = PendingIntent.getActivity(
            context,
            BUBBLE_REQUEST_CODE,
            bubbleActivityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            BUBBLE_REQUEST_CODE + 1,
            new Intent(context, MayaBubbleActivity.class).setAction(ACTION_OPEN_MAYA_CHAT),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.BubbleMetadata metadata = new NotificationCompat.BubbleMetadata.Builder(
            bubbleIntent,
            IconCompat.createWithResource(context, companionResource(outlook.companionId))
        )
            .setDesiredHeight(dp(context, 580))
            .setAutoExpandBubble(autoExpand)
            .setSuppressNotification(autoExpand)
            .build();

        NotificationCompat.MessagingStyle style = new NotificationCompat.MessagingStyle(companion)
            .setConversationTitle(outlook.companionName);
        List<ChatMessage> messages = messages(context);
        int firstMessage = Math.max(0, messages.size() - MAX_NOTIFICATION_MESSAGES);
        for (int index = firstMessage; index < messages.size(); index++) {
            ChatMessage message = messages.get(index);
            style.addMessage(
                message.text,
                message.timestamp,
                ChatMessage.USER.equals(message.role) ? userPerson() : companion
            );
        }

        String summary = outlook.currentCondition;
        if (TextUtils.isEmpty(summary)) summary = outlook.recommendedAction;
        if (TextUtils.isEmpty(summary)) summary = context.getString(R.string.app_name);

        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setColor(0xFF38CFE8)
            .setContentTitle(outlook.companionName)
            .setContentText(summary)
            .setStyle(style)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setShortcutId(SHORTCUT_ID)
            .addPerson(companion)
            .setContentIntent(contentIntent)
            .setOnlyAlertOnce(true)
            .setBubbleMetadata(metadata);
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification.build());
    }

    private static Person companionPerson(Context context, Outlook outlook) {
        return new Person.Builder()
            .setName(outlook.companionName)
            .setBot(true)
            .setImportant(true)
            .setIcon(IconCompat.createWithResource(context, companionResource(outlook.companionId)))
            .build();
    }

    private static Person userPerson() {
        return new Person.Builder().setName("You").build();
    }

    private static void ensureInitialAssistantMessage(Context context) {
        List<ChatMessage> stored = readMessages(context);
        if (!stored.isEmpty()) return;
        appendMessage(context, ChatMessage.ASSISTANT, outlook(context).initialMessage());
    }

    private static void appendMessage(Context context, String role, String text) {
        if (context == null || TextUtils.isEmpty(text) || TextUtils.isEmpty(text.trim())) return;
        Context appContext = context.getApplicationContext();
        List<ChatMessage> messages = readMessages(appContext);
        messages.add(new ChatMessage(role, text.trim(), System.currentTimeMillis()));
        if (messages.size() > MAX_STORED_MESSAGES) {
            messages = new ArrayList<>(messages.subList(messages.size() - MAX_STORED_MESSAGES, messages.size()));
        }
        writeMessages(appContext, messages);
    }

    private static List<ChatMessage> readMessages(Context context) {
        List<ChatMessage> messages = new ArrayList<>();
        String stored = MyanAidDevicePlugin.preferences(context).getString(CHAT_HISTORY, "");
        if (TextUtils.isEmpty(stored)) return messages;
        try {
            JSONArray values = new JSONArray(stored);
            for (int index = 0; index < values.length(); index++) {
                JSONObject value = values.optJSONObject(index);
                if (value == null) continue;
                String role = value.optString("role", "");
                String text = value.optString("text", "").trim();
                long timestamp = value.optLong("timestamp", 0L);
                if ((!ChatMessage.USER.equals(role) && !ChatMessage.ASSISTANT.equals(role)) || text.isEmpty()) continue;
                messages.add(new ChatMessage(role, text, timestamp > 0L ? timestamp : System.currentTimeMillis()));
            }
        } catch (JSONException ignored) {
            // Start a fresh local thread if an older app version wrote an
            // invalid preference value.
        }
        return messages;
    }

    private static void writeMessages(Context context, List<ChatMessage> messages) {
        JSONArray values = new JSONArray();
        for (ChatMessage message : messages) {
            JSONObject value = new JSONObject();
            try {
                value.put("role", message.role);
                value.put("text", message.text);
                value.put("timestamp", message.timestamp);
                values.put(value);
            } catch (JSONException ignored) {
                // JSONObject.put for the primitive values above should not
                // fail, but leaving out one bad item is safer than failing a
                // user-initiated conversation action.
            }
        }
        MyanAidDevicePlugin.preferences(context).edit().putString(CHAT_HISTORY, values.toString()).apply();
    }

    private static int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    static final class ChatMessage {
        static final String USER = "user";
        static final String ASSISTANT = "assistant";

        final String role;
        final String text;
        final long timestamp;

        ChatMessage(String role, String text, long timestamp) {
            this.role = role;
            this.text = text;
            this.timestamp = timestamp;
        }
    }

    static final class Outlook {
        final String companionId;
        final String companionName;
        String location = "";
        String currentCondition = "";
        String forecastSummary = "";
        String recommendedAction = "";
        String level = "";
        int score = -1;

        Outlook(String companionId, String companionName) {
            this.companionId = companionId;
            this.companionName = companionName;
        }

        String initialMessage() {
            StringBuilder message = new StringBuilder();
            if (!TextUtils.isEmpty(currentCondition)) message.append(currentCondition);
            if (!TextUtils.isEmpty(forecastSummary)) {
                if (message.length() > 0) message.append(" ");
                message.append(forecastSummary);
            }
            if (!TextUtils.isEmpty(recommendedAction)) {
                if (message.length() > 0) message.append(" ");
                message.append(recommendedAction);
            }
            if (message.length() == 0) {
                message.append("Your latest safety outlook will appear here when MyanAid refreshes it.");
            }
            return message.toString();
        }
    }
}
