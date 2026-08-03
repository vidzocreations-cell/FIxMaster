package com.example.fixmasterpos

import android.content.Context
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.fixmasterpos.theme.FixMasterPOSTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            FixMasterPOSTheme {
                val context = LocalContext.current
                val prefs = remember { context.getSharedPreferences("fixmaster_prefs", Context.MODE_PRIVATE) }
                
                var savedUrl by remember {
                    mutableStateOf(
                        prefs.getString("app_url", "https://fix-master.vercel.app") ?: "https://fix-master.vercel.app"
                    )
                }
                var showSettingsDialog by remember { mutableStateOf(false) }

                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
                        PosWebViewContainer(url = savedUrl)

                        // Floating Settings Button in Top Right Corner
                        SmallFloatingActionButton(
                            onClick = { showSettingsDialog = true },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(12.dp),
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                            contentColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ) {
                            Text("⚙️", fontSize = 16.sp)
                        }

                        if (showSettingsDialog) {
                            UrlInputDialog(
                                currentUrl = savedUrl,
                                onSave = { newUrl ->
                                    var cleanUrl = newUrl.trim()
                                    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                                        cleanUrl = "https://$cleanUrl"
                                    }
                                    prefs.edit().putString("app_url", cleanUrl).apply()
                                    savedUrl = cleanUrl
                                    showSettingsDialog = false
                                },
                                onDismiss = { showSettingsDialog = false }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PosWebViewContainer(url: String) {
    var webViewRef: WebView? = remember { null }

    BackHandler(enabled = true) {
        if (webViewRef?.canGoBack() == true) {
            webViewRef?.goBack()
        }
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                webViewRef = this
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    allowFileAccess = true
                    allowContentAccess = true
                    useWideViewPort = true
                    loadWithOverviewMode = true
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }

                webChromeClient = WebChromeClient()
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                        url?.let { view?.loadUrl(it) }
                        return true
                    }
                }

                loadUrl(url)
            }
        },
        update = { webView ->
            webViewRef = webView
            if (webView.url != url) {
                webView.loadUrl(url)
            }
        }
    )
}

@Composable
fun UrlInputDialog(currentUrl: String, onSave: (String) -> Unit, onDismiss: () -> Unit) {
    var inputUrl by remember { mutableStateOf(currentUrl) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Connect FixMaster POS", fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Enter your Vercel deployment URL:",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
                OutlinedTextField(
                    value = inputUrl,
                    onValueChange = { inputUrl = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(onClick = { onSave(inputUrl) }) {
                Text("Save & Connect")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
