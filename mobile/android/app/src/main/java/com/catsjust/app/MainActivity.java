package com.catsjust.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 统一系统栏背景为站点深色背景 #0a0a12，文字/图标使用浅色，
        // 与 WebView 内深色主题保持一致（时间、WiFi 等状态栏区域不再出现浅色底色）。
        Window window = getWindow();
        window.setStatusBarColor(Color.parseColor("#0a0a12"));
        window.setNavigationBarColor(Color.parseColor("#0a0a12"));
        int flags = window.getDecorView().getSystemUiVisibility();
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        window.getDecorView().setSystemUiVisibility(flags);

        // 始终加载最新线上内容：禁用 HTTP 缓存并清理，避免旧页面/旧 JS
        // 导致的功能问题（如视频播放仍走旧逻辑）。站点 HTML 本身 no-store，
        // 这里再兜底保证 WebView 每次导航都重新获取。
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.clearCache(true);
            webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
        }

        // 返回手势/按键：WebView 有历史则回退上一页，无历史才退出 App
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // 交给默认处理（退出 / 回到桌面）
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }
}

