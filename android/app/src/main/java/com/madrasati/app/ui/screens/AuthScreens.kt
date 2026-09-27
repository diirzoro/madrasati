package com.madrasati.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.madrasati.app.di.AppContainer
import com.madrasati.app.ui.components.AppTopBar
import com.madrasati.app.ui.theme.Danger
import com.madrasati.app.ui.theme.Primary
import com.madrasati.app.ui.theme.TextMuted
import com.madrasati.app.ui.viewmodel.AuthViewModel
import com.madrasati.app.util.t

@Composable
fun LoginScreen(
    onBack: () -> Unit,
    onRegister: () -> Unit,
    onLoggedIn: () -> Unit,
) {
    val vm: AuthViewModel = viewModel { AuthViewModel(AppContainer.get.authRepository) }

    Scaffold(topBar = { AppTopBar(title = t("login"), onBack = onBack) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
        ) {
            Text(t("loginTitle"), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(t("loginSubtitle"), style = MaterialTheme.typography.bodyMedium, color = TextMuted)
            Spacer(Modifier.height(24.dp))

            AuthField(vm.email, { vm.email = it }, t("email"))
            Spacer(Modifier.height(12.dp))
            AuthField(vm.password, { vm.password = it }, t("password"), password = true)
            Spacer(Modifier.height(8.dp))
            Text(t("passwordHint"), style = MaterialTheme.typography.labelMedium, color = TextMuted)

            if (vm.error != null) {
                Spacer(Modifier.height(12.dp))
                Text(vm.error.orEmpty(), color = Danger, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(Modifier.height(24.dp))
            Button(
                onClick = { vm.login { onLoggedIn() } },
                enabled = !vm.loading,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (vm.loading) {
                    CircularProgressIndicator(modifier = Modifier.height(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text(t("login"))
                }
            }

            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onRegister, modifier = Modifier.fillMaxWidth()) {
                Text(t("needAccount"), color = Primary)
            }
        }
    }
}

@Composable
fun RegisterScreen(
    onBack: () -> Unit,
    onLogin: () -> Unit,
    onRegistered: () -> Unit,
) {
    val vm: AuthViewModel = viewModel { AuthViewModel(AppContainer.get.authRepository) }

    Scaffold(topBar = { AppTopBar(title = t("register"), onBack = onBack) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
        ) {
            Text(t("registerTitle"), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(4.dp))
            Text(t("registerSubtitle"), style = MaterialTheme.typography.bodyMedium, color = TextMuted)
            Spacer(Modifier.height(24.dp))

            AuthField(vm.name, { vm.name = it }, t("name"))
            Spacer(Modifier.height(12.dp))
            AuthField(vm.email, { vm.email = it }, t("email"))
            Spacer(Modifier.height(12.dp))
            AuthField(vm.phone, { vm.phone = it }, t("phone"))
            Spacer(Modifier.height(12.dp))
            AuthField(vm.password, { vm.password = it }, t("password"), password = true)
            Spacer(Modifier.height(8.dp))
            Text(t("passwordHint"), style = MaterialTheme.typography.labelMedium, color = TextMuted)

            if (vm.error != null) {
                Spacer(Modifier.height(12.dp))
                Text(vm.error.orEmpty(), color = Danger, style = MaterialTheme.typography.bodyMedium)
            }

            Spacer(Modifier.height(24.dp))
            Button(
                onClick = { vm.register { onRegistered() } },
                enabled = !vm.loading,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (vm.loading) {
                    CircularProgressIndicator(modifier = Modifier.height(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text(t("register"))
                }
            }

            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onLogin, modifier = Modifier.fillMaxWidth()) {
                Text(t("haveAccount"), color = Primary)
            }
        }
    }
}

@Composable
private fun AuthField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    password: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        modifier = Modifier.fillMaxWidth(),
    )
}
