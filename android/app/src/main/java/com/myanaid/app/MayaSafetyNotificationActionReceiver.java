package com.myanaid.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Handles explicit quick actions from a critical weather notification. */
public final class MayaSafetyNotificationActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (CompanionOverlayService.ACTION_OPEN_MAYA_CHAT.equals(action)) {
            MayaChatBubbleManager.show(context);
            return;
        }
        if (CompanionOverlayService.ACTION_LISTEN_COMPANION.equals(action)) {
            MayaChatBubbleManager.openForSpeech(context);
            return;
        }
        if (CompanionOverlayService.ACTION_MUTE_COMPANION_ALERTS.equals(action)) {
            MayaSafetyNotificationManager.muteForTwoHours(context);
            return;
        }
        if (CompanionOverlayService.ACTION_OPEN_FORECAST.equals(action)) {
            MayaSafetyNotificationManager.openForecast(context);
        }
    }
}
