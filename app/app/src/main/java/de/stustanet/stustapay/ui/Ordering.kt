package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Button
import androidx.compose.material.Scaffold
import androidx.compose.material.Text
import androidx.compose.material.rememberScaffoldState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview

@Composable
private fun OrderItem(name: String, price: String, amount: String) = Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
) {
    Text(text = price.plus(" x ").plus(amount),
            modifier = Modifier.fillMaxWidth(0.3f))
    Box(modifier = Modifier.fillMaxWidth(0.9f)) {
        Row(    horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            Button(
                    onClick = { /*TODO*/ },
                    modifier = Modifier.fillMaxWidth(0.7f)
            ) {
                Text(text = name)
            }
            Button(
                    onClick = { /*TODO*/ },
                    modifier = Modifier.fillMaxWidth()
            ) {
                Text(text = "-")
            }
        }
    }

}

@Preview
@Composable
fun OrderView() {
    val state = rememberScaffoldState()

    Scaffold(
            scaffoldState = state,

            content = { paddingValues ->
                LazyColumn(modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = paddingValues.calculateBottomPadding())) {
                    item{ OrderItem(name = "Bier", amount = "2", price = "2")}
                    item{ OrderItem(name = "Maß", amount = "1", price = "4")}
                    item{ OrderItem(name = "Radler", amount = "1", price = "1,5")}
                    item{ OrderItem(name = "Spezi", amount = "0", price = "")}
                    item{ OrderItem(name = "Weißbier", amount = "0", price = "")}
                    item{ OrderItem(name = "Pfand zurück", amount = "0", price = "")}
                }
            },

            bottomBar = {
                Row(horizontalArrangement = Arrangement.SpaceEvenly) {
                    Button(onClick = { /*TODO*/ }, modifier = Modifier.fillMaxWidth(0.45f)) {
                        Text(text = "❌")
                    }
                    Button(onClick = { /*TODO*/ }, modifier = Modifier.fillMaxWidth(0.9f)) {
                        Text(text = "✓")
                    }
                }
            }
    )

}
