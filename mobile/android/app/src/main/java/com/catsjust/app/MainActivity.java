package com.catsjust.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;

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
    }
}

