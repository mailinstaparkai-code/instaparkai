package ai.instapark.valet.ui.components

import ai.instapark.valet.ui.theme.ValetTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

/** design.md §9 -- OTP as four 62px boxes with the field focus halo, one shared value. */
@Composable
fun OtpBoxInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    boxCount: Int = 4,
) {
    val colors = ValetTheme.colors
    BasicTextField(
        value = value,
        onValueChange = { new -> if (new.length <= boxCount && new.all { it.isDigit() }) onValueChange(new) },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        textStyle = TextStyle.Default,
        modifier = modifier.fillMaxWidth(),
        decorationBox = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally),
                modifier = Modifier.fillMaxWidth(),
            ) {
                repeat(boxCount) { index ->
                    val char = value.getOrNull(index)?.toString() ?: ""
                    val focused = index == value.length
                    Box(
                        modifier = Modifier
                            .size(62.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(colors.fieldFill)
                            .border(
                                width = if (focused) 1.5.dp else 1.dp,
                                color = if (focused) colors.primary else colors.fieldBorder,
                                shape = RoundedCornerShape(16.dp),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(char, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = colors.ink)
                    }
                }
            }
        },
    )
}
