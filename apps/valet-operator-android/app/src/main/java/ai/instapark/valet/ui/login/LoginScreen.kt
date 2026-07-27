package ai.instapark.valet.ui.login

import ai.instapark.valet.BuildConfig
import ai.instapark.valet.R
import ai.instapark.valet.ui.appContainer
import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * HANDOFF 28-Jul §10 / design.md §9 -- "5a Login, photographic": full-bleed hero photo,
 * top-to-bottom scrim, frosted logo tile + "Site online" pill, headline over a frosted
 * white card holding the fields + gradient Sign in. Remember-me/forgot-password/SSO are
 * intentionally NOT included (confirmed with product owner -- kept to today's exact
 * username/password fields and flow, no new auth surface).
 */
@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val container = appContainer()
    val viewModel: LoginViewModel = viewModel(
        factory = LoginViewModelFactory(container.sessionRepository, container.pushTokenRepository)
    )
    val colors = ValetTheme.colors
    var passwordVisible by remember { mutableStateOf(false) }

    val pulse = rememberInfiniteTransition(label = "siteOnlinePulse")
    val pulseAlpha by pulse.animateFloat(
        initialValue = 1f,
        targetValue = 0.35f,
        animationSpec = infiniteRepeatable(tween(1000, easing = LinearEasing), RepeatMode.Reverse),
        label = "pulseAlpha",
    )

    Box(modifier = Modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.img_hero_app),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.00f to Color(0xFF081E4E).copy(alpha = 0.10f),
                            0.34f to Color(0xFF081E4E).copy(alpha = 0.16f),
                            0.62f to Color(0xFF081E4E).copy(alpha = 0.62f),
                            1.00f to Color(0xFF081E4E).copy(alpha = 0.88f),
                        ),
                    )
                )
        )

        Column(modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White.copy(alpha = 0.94f))
                        .padding(horizontal = 14.dp, vertical = 9.dp),
                ) {
                    Image(
                        painter = painterResource(R.drawable.img_logo_lockup_light),
                        contentDescription = "InstaParkAi",
                        modifier = Modifier.height(26.dp),
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Color.White.copy(alpha = 0.14f))
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF4ADE80).copy(alpha = pulseAlpha)),
                    )
                    Text(
                        "Site online",
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(start = 7.dp),
                    )
                }
            }

            Spacer(Modifier.weight(1f))

            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
                Text(
                    "Every arrival,",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                Text(
                    "handled beautifully.",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                Text(
                    "Sign in to run today's valet floor.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.72f),
                    modifier = Modifier.padding(top = 8.dp),
                )
                Spacer(Modifier.height(18.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(28.dp))
                        .background(colors.surface.copy(alpha = 0.97f))
                        .padding(22.dp),
                ) {
                    val fieldColors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = colors.fieldFill,
                        unfocusedContainerColor = colors.fieldFill,
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.fieldBorder,
                    )
                    OutlinedTextField(
                        value = viewModel.username,
                        onValueChange = viewModel::onUsernameChange,
                        label = { Text("Username") },
                        leadingIcon = { Icon(Icons.Outlined.Person, contentDescription = null, tint = colors.inkTertiary) },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        colors = fieldColors,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
                    )
                    Spacer(Modifier.height(14.dp))
                    OutlinedTextField(
                        value = viewModel.password,
                        onValueChange = viewModel::onPasswordChange,
                        label = { Text("Password") },
                        leadingIcon = { Icon(Icons.Outlined.Lock, contentDescription = null, tint = colors.inkTertiary) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    if (passwordVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                                    contentDescription = if (passwordVisible) "Hide password" else "Show password",
                                    tint = colors.inkTertiary,
                                )
                            }
                        },
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        shape = RoundedCornerShape(16.dp),
                        colors = fieldColors,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp),
                    )
                    viewModel.errorMessage?.let { message ->
                        Spacer(Modifier.height(8.dp))
                        Text(message, color = colors.danger, style = MaterialTheme.typography.bodySmall)
                    }
                    Spacer(Modifier.height(18.dp))

                    ShimmerSignInButton(
                        loading = viewModel.isLoading,
                        onClick = { viewModel.login(onLoginSuccess) },
                    )

                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.Shield, contentDescription = null, tint = colors.inkTertiary, modifier = Modifier.size(14.dp))
                        Text(
                            "Secured · InstaPark AI v${BuildConfig.VERSION_NAME}",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.inkTertiary,
                            modifier = Modifier.padding(start = 6.dp),
                        )
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ShimmerSignInButton(loading: Boolean, onClick: () -> Unit) {
    val colors = ValetTheme.colors
    val transition = rememberInfiniteTransition(label = "signInShimmer")
    val shimmerX by transition.animateFloat(
        initialValue = -300f,
        targetValue = 300f,
        animationSpec = infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart),
        label = "shimmerX",
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Brush.linearGradient(listOf(colors.primaryLight, colors.primary)))
            .clickable(enabled = !loading, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = androidx.compose.ui.Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
                    .background(
                        Brush.linearGradient(
                            colors = listOf(Color.Transparent, Color.White.copy(alpha = 0.22f), Color.Transparent),
                            start = Offset(shimmerX, 0f),
                            end = Offset(shimmerX + 120f, 60f),
                        )
                    ),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Sign in", color = Color.White, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Outlined.ArrowForward, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
            }
        }
    }
}
