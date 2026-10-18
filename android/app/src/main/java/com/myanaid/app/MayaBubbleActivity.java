package com.myanaid.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.text.InputType;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.List;
import java.util.Locale;

/**
 * Compact native conversation UI hosted by Android's Bubble surface.
 *
 * <p>It deliberately does not embed the Capacitor WebView: a Bubble must stay
 * lightweight, remain usable while the main app is backgrounded, and should
 * never silently perform a remote AI request from an overlay surface.</p>
 */
public class MayaBubbleActivity extends Activity {
    public static final String EXTRA_SPEAK_OUTLOOK = "com.myanaid.app.extra.SPEAK_OUTLOOK";

    private LinearLayout thread;
    private ScrollView threadScroll;
    private EditText draft;
    private ImageView companionImage;
    private TextView companionName;
    private TextView outlookTitle;
    private TextView outlookDetails;
    private TextView outlookAction;
    private TextToSpeech textToSpeech;
    private boolean textToSpeechReady;
    private String pendingSpeech;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        setContentView(createContent());
        render();
        if (getIntent().getBooleanExtra(EXTRA_SPEAK_OUTLOOK, false)) speakOutlook();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.getBooleanExtra(EXTRA_SPEAK_OUTLOOK, false)) speakOutlook();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (thread != null) render();
    }

    @Override
    protected void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        textToSpeech = null;
        textToSpeechReady = false;
        pendingSpeech = null;
        super.onDestroy();
    }

    private View createContent() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFFF7FCFF);
        root.setPadding(dp(14), dp(14), dp(14), dp(12));

        root.addView(createHeader());
        root.addView(createOutlookCard(), margins(0, dp(10), 0, dp(10)));

        threadScroll = new ScrollView(this);
        threadScroll.setFillViewport(true);
        threadScroll.setClipToPadding(false);
        thread = new LinearLayout(this);
        thread.setOrientation(LinearLayout.VERTICAL);
        thread.setPadding(0, dp(2), 0, dp(8));
        threadScroll.addView(thread, new ScrollView.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        root.addView(threadScroll, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            0,
            1f
        ));
        root.addView(createComposer(), margins(0, dp(6), 0, 0));
        return root;
    }

    private View createHeader() {
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setOrientation(LinearLayout.HORIZONTAL);

        companionImage = new ImageView(this);
        companionImage.setScaleType(ImageView.ScaleType.CENTER_CROP);
        companionImage.setBackground(roundBackground(0xFFFFFFFF, 0x3300A9C7, dp(14)));
        header.addView(companionImage, new LinearLayout.LayoutParams(dp(48), dp(48)));

        LinearLayout titleGroup = new LinearLayout(this);
        titleGroup.setOrientation(LinearLayout.VERTICAL);
        titleGroup.setPadding(dp(10), 0, dp(6), 0);
        companionName = text(18, 0xFF102332, Typeface.BOLD);
        TextView subtitle = text(12, 0xFF2C87A1, Typeface.BOLD);
        subtitle.setText(getString(R.string.maya_chat_safety_label));
        titleGroup.addView(companionName);
        titleGroup.addView(subtitle, margins(0, dp(2), 0, 0));
        header.addView(titleGroup, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        ImageButton close = new ImageButton(this);
        close.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
        close.setImageTintList(null);
        close.setContentDescription(getString(R.string.maya_chat_close));
        close.setBackgroundColor(Color.TRANSPARENT);
        close.setPadding(dp(8), dp(8), dp(8), dp(8));
        close.setOnClickListener(view -> finish());
        header.addView(close, new LinearLayout.LayoutParams(dp(42), dp(42)));
        return header;
    }

    private View createOutlookCard() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(12), dp(10), dp(12), dp(10));
        card.setBackground(roundBackground(0xFFE7F8FD, 0x5538CFE8, dp(18)));

        outlookTitle = text(13, 0xFF0C7194, Typeface.BOLD);
        outlookTitle.setMaxLines(1);
        outlookTitle.setEllipsize(TextUtils.TruncateAt.END);
        outlookDetails = text(13, 0xFF1A3444, Typeface.NORMAL);
        outlookDetails.setMaxLines(2);
        outlookDetails.setEllipsize(TextUtils.TruncateAt.END);
        outlookAction = text(13, 0xFF112B3B, Typeface.BOLD);
        outlookAction.setMaxLines(2);
        outlookAction.setEllipsize(TextUtils.TruncateAt.END);
        card.addView(outlookTitle);
        card.addView(outlookDetails, margins(0, dp(4), 0, 0));
        card.addView(outlookAction, margins(0, dp(6), 0, 0));
        return card;
    }

    private View createComposer() {
        LinearLayout composer = new LinearLayout(this);
        composer.setGravity(Gravity.CENTER_VERTICAL);
        composer.setOrientation(LinearLayout.HORIZONTAL);

        draft = new EditText(this);
        draft.setTextSize(15);
        draft.setTextColor(0xFF102332);
        draft.setHintTextColor(0xFF65808E);
        draft.setSingleLine(false);
        draft.setMaxLines(3);
        draft.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        draft.setImeOptions(EditorInfo.IME_ACTION_SEND);
        draft.setPadding(dp(12), dp(8), dp(12), dp(8));
        draft.setBackground(roundBackground(0xFFFFFFFF, 0x442B98B8, dp(16)));
        draft.setOnEditorActionListener((view, actionId, event) -> {
            boolean send = actionId == EditorInfo.IME_ACTION_SEND ||
                (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_DOWN && !event.isShiftPressed());
            if (send) {
                sendMessage();
                return true;
            }
            return false;
        });
        composer.addView(draft, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));

        Button send = new Button(this);
        send.setAllCaps(false);
        send.setText(getString(R.string.maya_chat_send));
        send.setTextSize(14);
        send.setTextColor(Color.WHITE);
        send.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        send.setContentDescription(getString(R.string.maya_chat_send_description));
        send.setMinWidth(0);
        send.setMinHeight(0);
        send.setPadding(dp(14), dp(9), dp(14), dp(9));
        send.setBackground(roundBackground(0xFF087EBA, 0x00000000, dp(16)));
        send.setOnClickListener(view -> sendMessage());
        composer.addView(send, margins(dp(8), 0, 0, 0));
        return composer;
    }

    private void render() {
        MayaChatBubbleManager.Outlook outlook = MayaChatBubbleManager.outlook(this);
        companionImage.setImageResource(MayaChatBubbleManager.companionResource(outlook.companionId));
        companionImage.setContentDescription(outlook.companionName);
        companionName.setText(outlook.companionName);
        draft.setHint(getString(R.string.maya_chat_message_hint, outlook.companionName));

        String status = getString(R.string.maya_chat_latest_outlook);
        if (!TextUtils.isEmpty(outlook.location)) status += " · " + outlook.location;
        if (outlook.score >= 0) status += " · " + outlook.score + "/100";
        outlookTitle.setText(status);

        String details = outlook.currentCondition;
        if (TextUtils.isEmpty(details)) details = outlook.forecastSummary;
        if (TextUtils.isEmpty(details)) details = getString(R.string.maya_chat_outlook_waiting);
        outlookDetails.setText(details);

        String action = outlook.recommendedAction;
        if (TextUtils.isEmpty(action)) action = getString(R.string.maya_chat_recommendation_fallback);
        outlookAction.setText(action);

        thread.removeAllViews();
        List<MayaChatBubbleManager.ChatMessage> messages = MayaChatBubbleManager.messages(this);
        for (MayaChatBubbleManager.ChatMessage message : messages) {
            thread.addView(createMessage(message), margins(0, dp(4), 0, dp(4)));
        }
        threadScroll.post(() -> threadScroll.fullScroll(View.FOCUS_DOWN));
    }

    private View createMessage(MayaChatBubbleManager.ChatMessage message) {
        LinearLayout row = new LinearLayout(this);
        boolean isUser = MayaChatBubbleManager.ChatMessage.USER.equals(message.role);
        row.setGravity(isUser ? Gravity.END : Gravity.START);

        TextView bubble = text(14, isUser ? Color.WHITE : 0xFF102B3B, Typeface.NORMAL);
        bubble.setText(message.text);
        bubble.setTextIsSelectable(true);
        bubble.setLineSpacing(dp(2), 1f);
        bubble.setPadding(dp(12), dp(9), dp(12), dp(9));
        bubble.setMaxWidth(Math.round(getResources().getDisplayMetrics().widthPixels * 0.76f));
        bubble.setBackground(roundBackground(
            isUser ? 0xFF087EBA : 0xFFFFFFFF,
            isUser ? 0x00000000 : 0x2238CFE8,
            dp(16)
        ));
        row.addView(bubble, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        return row;
    }

    private void sendMessage() {
        String message = draft == null ? "" : draft.getText().toString().trim();
        if (message.isEmpty()) return;
        MayaChatBubbleManager.appendUserMessage(this, message);
        MayaChatBubbleManager.appendAssistantMessage(this, MayaChatBubbleManager.localReply(this));
        draft.setText("");
        render();
        MayaChatBubbleManager.refresh(this);
    }

    private void speakOutlook() {
        MayaChatBubbleManager.Outlook outlook = MayaChatBubbleManager.outlook(this);
        String condition = outlook.currentCondition;
        if (TextUtils.isEmpty(condition)) condition = outlook.forecastSummary;
        if (TextUtils.isEmpty(condition)) condition = getString(R.string.maya_chat_outlook_waiting);
        String action = outlook.recommendedAction;
        if (TextUtils.isEmpty(action)) action = getString(R.string.maya_chat_recommendation_fallback);
        pendingSpeech = outlook.companionName + ". " + condition + ". " + action;

        if (textToSpeech == null) {
            textToSpeech = new TextToSpeech(getApplicationContext(), status -> {
                if (status != TextToSpeech.SUCCESS || textToSpeech == null) return;
                textToSpeechReady = true;
                Locale locale = Locale.getDefault();
                if (textToSpeech.isLanguageAvailable(locale) >= TextToSpeech.LANG_AVAILABLE) {
                    textToSpeech.setLanguage(locale);
                }
                speakPendingOutlook();
            });
            return;
        }
        speakPendingOutlook();
    }

    private void speakPendingOutlook() {
        if (!textToSpeechReady || textToSpeech == null || TextUtils.isEmpty(pendingSpeech)) return;
        String words = pendingSpeech;
        pendingSpeech = null;
        textToSpeech.speak(words, TextToSpeech.QUEUE_FLUSH, null, "myanaid_bubble_outlook");
    }

    private TextView text(int sizeSp, int color, int style) {
        TextView view = new TextView(this);
        view.setTextSize(sizeSp);
        view.setTextColor(color);
        view.setTypeface(Typeface.DEFAULT, style);
        view.setIncludeFontPadding(false);
        return view;
    }

    private LinearLayout.LayoutParams margins(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(left, top, right, bottom);
        return params;
    }

    private GradientDrawable roundBackground(int color, int strokeColor, int radius) {
        GradientDrawable background = new GradientDrawable();
        background.setColor(color);
        background.setCornerRadius(radius);
        if (strokeColor != 0x00000000) background.setStroke(dp(1), strokeColor);
        return background;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
