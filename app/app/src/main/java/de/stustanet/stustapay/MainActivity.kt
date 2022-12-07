package de.stustanet.stustapay

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import de.stustanet.stustapay.ui.theme.StuStaPayTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            StuStaPayTheme {
                // A surface container using the 'background' color from the theme
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colors.background
                ) {
                    FestivalCheck("StuStaCulum")
                }
            }
        }
    }
}

@Composable
fun FestivalCheck(name: String) {
    Text(text = "The best festival is $name!")
}

@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
    StuStaPayTheme {
        FestivalCheck("StuStaCulum")
    }
}