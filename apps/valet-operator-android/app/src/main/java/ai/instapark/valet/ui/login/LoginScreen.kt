package ai.instapark.valet.ui.login

import ai.instapark.valet.ui.appContainer
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val container = appContainer()
    val viewModel: LoginViewModel = viewModel(
        factory = LoginViewModelFactory(container.sessionRepository, container.pushTokenRepository)
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("InstaPark Valet", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            "Sign in to continue.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = viewModel.username,
            onValueChange = viewModel::onUsernameChange,
            label = { Text("Username") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = viewModel.password,
            onValueChange = viewModel::onPasswordChange,
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
        )
        viewModel.errorMessage?.let { message ->
            Spacer(Modifier.height(8.dp))
            Text(message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { viewModel.login(onLoginSuccess) },
            enabled = !viewModel.isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
        ) {
            if (viewModel.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = MaterialTheme.colorScheme.onPrimary,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("Sign in")
            }
        }
    }
}
