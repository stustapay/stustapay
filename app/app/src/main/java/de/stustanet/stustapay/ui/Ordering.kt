package de.stustanet.stustapay.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp


@Composable
fun OrderItem(label: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            modifier = Modifier.padding(start = 16.dp),
            text = label,
            fontSize = 20.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

@Preview
@Composable
fun OrderView() {
    LazyColumn {
        item {
            Text(text = "First item")
        }

        items(50) { index ->
            OrderItem(label = "item $index")
        }

        item {
            Text(text = "Last item")
        }
    }
}
