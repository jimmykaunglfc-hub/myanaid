package com.myanaid.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native companion bridge used by the Capacitor web application.
 *
 * The plugin deliberately keeps all user choices in one private preference
 * store, so the foreground service can continue presenting an explicitly
 * enabled companion after the WebView is backgrounded.
 */
@CapacitorPlugin(name = "MyanAidDevice")
public class MyanAidDevicePlugin extends Plugin {
    static final String PREFERENCES = "myanaid_device_alerts";
    static final String REMINDER = "advance_outlook_reminder";
    static final String COMPANION_ID = "companion_id";
    static final String COMPANION_NAME = "companion_name";
    static final String NOTIFICATIONS = "notifications";
    static final String AUDIO = "audio";
    static final String COMPANION = "companion";
    static final String COMPANION_MOVABLE = "companion_movable";
    static final String WIDGET = "widget";
    private static final String NOTIFICATION_PROMPTED = "notification_permission_prompted";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 4102;

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void saveAdvanceOutlook(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.trim().isEmpty()) {
            call.reject("invalid reminder payload");
            return;
        }

        String companionId = call.getString("companionId");
        String companionName = call.getString("companionName");
        preferences().edit()
            .putString(REMINDER, call.getData().toString())
            .putString(COMPANION_ID, companionId == null || companionId.trim().isEmpty() ? "maya" : companionId)
            .putString(COMPANION_NAME, companionName == null || companionName.trim().isEmpty() ? "MyanAid" : companionName)
            .apply();

        // A running opt-in overlay receives the new selected companion and
        // outlook immediately; otherwise this remains a harmless local save.
        CompanionOverlayService.startIfEnabled(getContext());
        MayaSafetyNotificationManager.refreshForStoredOutlook(getContext());
        call.resolve(new JSObject().put("saved", true));
    }

    @PluginMethod
    public void setPreferences(PluginCall call) {
        boolean notifications = call.getBoolean("notifications", false);
        boolean audio = call.getBoolean("audio", false);
        boolean companion = call.getBoolean("companion", false);
        boolean widget = call.getBoolean("widget", false);

        SharedPreferences.Editor editor = preferences().edit()
            .putBoolean(NOTIFICATIONS, notifications)
            .putBoolean(AUDIO, audio)
            .putBoolean(COMPANION, companion)
            .putBoolean(WIDGET, widget);
        // Turning the preference off and on again is an intentional retry for
        // someone who previously dismissed Android's notification prompt.
        if (!notifications) editor.putBoolean(NOTIFICATION_PROMPTED, false);
        editor.apply();

        JSObject result = new JSObject();
        result.put("notificationPermission", notificationPermission());

        // Notifications are a separate opt-in from the floating mascot, so
        // request Android's runtime permission even when the person only
        // wants rich weather alerts and does not enable the overlay.
        requestNotificationPermissionIfNeeded(notifications);
        if (notifications) MayaSafetyNotificationManager.refreshForStoredOutlook(getContext());
        else MayaSafetyNotificationManager.clear(getContext());

        if (!companion) {
            CompanionOverlayService.stop(getContext());
            result.put("overlayPermission", "not-required");
            call.resolve(result);
            return;
        }

        if (!Settings.canDrawOverlays(getContext())) {
            requestOverlayPermission();
            // The user's selection is already saved. handleOnResume starts
            // the service after they grant access in Android Settings.
            result.put("overlayPermission", "denied");
            call.resolve(result);
            return;
        }

        CompanionOverlayService.startIfEnabled(getContext());
        result.put("overlayPermission", "granted");
        result.put("notificationPermission", notificationPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject result = new JSObject();
        result.put("platform", "android");
        // Android home-screen widgets are intentionally not claimed until an
        // AppWidgetProvider ships. The floating companion is available now.
        result.put("widget", false);
        result.put("floatingMascot", true);
        result.put("overlayPermission", Settings.canDrawOverlays(getContext()));
        result.put("notificationPermission", notificationPermission());
        call.resolve(result);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (preferences().getBoolean(COMPANION, false) && Settings.canDrawOverlays(getContext())) {
            requestNotificationPermissionIfNeeded(preferences().getBoolean(NOTIFICATIONS, false));
            CompanionOverlayService.startIfEnabled(getContext());
        }
        if (preferences().getBoolean(NOTIFICATIONS, false)) {
            MayaSafetyNotificationManager.refreshForStoredOutlook(getContext());
        }
    }

    private SharedPreferences preferences() {
        return preferences(getContext());
    }

    private void requestOverlayPermission() {
        if (getActivity() == null) return;
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivity(intent);
    }

    private void requestNotificationPermissionIfNeeded(boolean requestedByPerson) {
        if (!requestedByPerson || Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getActivity() == null) return;
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        if (preferences().getBoolean(NOTIFICATION_PROMPTED, false)) return;
        preferences().edit().putBoolean(NOTIFICATION_PROMPTED, true).apply();
        getActivity().requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, NOTIFICATION_PERMISSION_REQUEST);
    }

    private boolean notificationPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }
}
