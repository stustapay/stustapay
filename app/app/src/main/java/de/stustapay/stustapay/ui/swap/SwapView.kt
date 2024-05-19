package de.stustapay.stustapay.ui.swap

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.Button
import androidx.compose.material.Divider
import androidx.compose.material.Text
import androidx.compose.material.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.stustapay.libssp.model.NfcTag
import de.stustapay.stustapay.R
import de.stustapay.stustapay.ui.common.TagTextField
import de.stustapay.stustapay.ui.nav.NavScaffold
import kotlinx.coroutines.launch

@Preview
@Composable
fun SwapView(
    leaveView: () -> Unit = {},
    viewModel: SwapViewModel = hiltViewModel(),
) {
    val scope = rememberCoroutineScope()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    BackHandler {
        leaveView()
    }

    NavScaffold(
        title = { Text(stringResource(R.string.customer_swap)) }, navigateBack = leaveView
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(it)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(10.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        stringResource(R.string.customer_oldtag),
                        fontSize = 24.sp,
                        modifier = Modifier.padding(end = 20.dp)
                    )
                    TagTextField(
                        uiState.oldTag.uid,
                        modifier = Modifier.fillMaxWidth(),
                    ) { id ->

                    }
                }

                Button(modifier = Modifier
                    .fillMaxWidth()
                    .padding(10.dp), onClick = {

                }) {
                    Text(stringResource(R.string.customer_scanoldtag), fontSize = 24.sp)
                }

                Divider()

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp, top = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        stringResource(R.string.customer_comment),
                        fontSize = 24.sp,
                        modifier = Modifier.padding(end = 20.dp)
                    )
                    TextField(
                        value = uiState.comment, onValueChange = {

                        }, singleLine = true
                    )
                }

                Divider()

                Button(modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp), onClick = {
                }) {
                    Text(stringResource(R.string.customer_swap), fontSize = 24.sp)
                }
            }
        }
    }
}