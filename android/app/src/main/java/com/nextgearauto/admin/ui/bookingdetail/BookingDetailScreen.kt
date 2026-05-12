package com.nextgearauto.admin.ui.bookingdetail

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.nextgearauto.admin.api.BookingPaymentRowDto
import com.nextgearauto.admin.domain.BookingLifecycle
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val PAYMENT_METHODS = listOf(
    "stripe" to "Stripe / Card",
    "cash" to "Cash",
    "zelle" to "Zelle",
    "venmo" to "Venmo",
    "check" to "Check",
    "other" to "Other",
)

private val ALLOWED_UPLOAD_MIMES = setOf(
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
)

private fun enqueueUpload(
    context: Context,
    scope: CoroutineScope,
    viewModel: BookingDetailViewModel,
    uri: Uri,
    docType: String,
    onClientError: (String?) -> Unit,
) {
    scope.launch(Dispatchers.IO) {
        val cr = context.contentResolver
        val mime = cr.getType(uri) ?: run {
            withContext(Dispatchers.Main) { onClientError("Could not read file type") }
            return@launch
        }
        if (mime !in ALLOWED_UPLOAD_MIMES) {
            withContext(Dispatchers.Main) {
                onClientError("Use JPG, PNG, WebP, or PDF (max 5 MB)")
            }
            return@launch
        }
        val bytes = cr.openInputStream(uri)?.use { it.readBytes() } ?: run {
            withContext(Dispatchers.Main) { onClientError("Could not read file") }
            return@launch
        }
        if (bytes.size > 5 * 1024 * 1024) {
            withContext(Dispatchers.Main) { onClientError("File too large (max 5 MB)") }
            return@launch
        }
        val ext = when (mime) {
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "application/pdf" -> "pdf"
            else -> "bin"
        }
        val name = "${docType}_${System.currentTimeMillis()}.$ext"
        withContext(Dispatchers.Main) { onClientError(null) }
        viewModel.uploadDocument(bytes, name, mime, docType)
    }
}

@Composable
fun BookingDetailScreen(
    viewModel: BookingDetailViewModel,
    onBack: () -> Unit,
) {
    LaunchedEffect(Unit) { viewModel.load() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Booking") },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text("Back") }
                },
            )
        },
    ) { innerPadding ->
        Box(Modifier.padding(innerPadding)) {
            when (val s = viewModel.uiState) {
                BookingDetailUiState.Loading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }

                is BookingDetailUiState.Error -> {
                    Column(
                        Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(s.message, color = MaterialTheme.colorScheme.error)
                        Button(onClick = { viewModel.load() }) { Text("Retry") }
                    }
                }

                is BookingDetailUiState.Success -> {
                    BookingDetailBody(viewModel = viewModel, state = s)
                }
            }

            if (viewModel.busy && viewModel.uiState !is BookingDetailUiState.Loading) {
                Box(
                    Modifier
                        .fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BookingDetailBody(
    viewModel: BookingDetailViewModel,
    state: BookingDetailUiState.Success,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val b = state.booking
    var amountText by remember { mutableStateOf("") }
    var noteText by remember { mutableStateOf("") }
    var selectedMethod by remember { mutableStateOf(PAYMENT_METHODS.first().first) }
    var clientUploadHint by remember { mutableStateOf<String?>(null) }

    val nextStatuses = BookingLifecycle.allowedNextStatuses(b.status)

    val pickIdPhoto = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri: Uri? ->
        uri?.let {
            enqueueUpload(context, scope, viewModel, it, "id_document") { err ->
                clientUploadHint = err
            }
        }
    }

    val pickInsurancePhoto = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia(),
    ) { uri: Uri? ->
        uri?.let {
            enqueueUpload(context, scope, viewModel, it, "insurance_proof") { err ->
                clientUploadHint = err
            }
        }
    }

    val pickIdPdf = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri: Uri? ->
        uri?.let {
            enqueueUpload(context, scope, viewModel, it, "id_document") { err ->
                clientUploadHint = err
            }
        }
    }

    val pickInsurancePdf = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri: Uri? ->
        uri?.let {
            enqueueUpload(context, scope, viewModel, it, "insurance_proof") { err ->
                clientUploadHint = err
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(b.customer_name ?: "Guest", style = MaterialTheme.typography.headlineSmall)
        Text(
            listOfNotNull(b.status?.uppercase(), b.vehicle_name).joinToString(" · "),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text("${b.pickup_date ?: "—"} ${b.pickup_time ?: ""} → ${b.return_date ?: "—"} ${b.return_time ?: ""}")

        b.customer_email?.let { Text("Email: $it") }
        b.customer_phone?.let { Text("Phone: $it") }
        Text("Total: $" + (b.total_price ?: 0) + " · Deposit recorded: $" + (b.deposit ?: 0))
        b.agreement_signed_at?.let { Text("Agreement signed: $it") }
        b.admin_notes?.takeIf { it.isNotBlank() }?.let {
            Text("Notes: $it", style = MaterialTheme.typography.bodySmall)
        }

        if (nextStatuses.isNotEmpty()) {
            Text("Change status", style = MaterialTheme.typography.titleMedium)
            viewModel.statusActionError?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                nextStatuses.forEach { st ->
                    OutlinedButton(
                        onClick = { viewModel.patchStatus(st) },
                        enabled = !viewModel.busy,
                    ) {
                        Text("→ ${BookingLifecycle.labelForStatus(st)}")
                    }
                }
            }
            if (b.status == "pending") {
                Text(
                    "Confirm requires a signed agreement on the server.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Text("Documents", style = MaterialTheme.typography.titleMedium)
        b.id_document_url?.takeIf { it.isNotBlank() }?.let {
            Text("ID on file ✓", style = MaterialTheme.typography.bodySmall)
        }
        b.insurance_proof_url?.takeIf { it.isNotBlank() }?.let {
            Text("Insurance proof on file ✓", style = MaterialTheme.typography.bodySmall)
        }
        clientUploadHint?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        viewModel.uploadError?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Driver license / ID", style = MaterialTheme.typography.labelLarge)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        pickIdPhoto.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
                ) { Text("Photo") }
                OutlinedButton(onClick = { pickIdPdf.launch("application/pdf") }) {
                    Text("PDF")
                }
            }
            Text("Insurance proof", style = MaterialTheme.typography.labelLarge)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        pickInsurancePhoto.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly),
                        )
                    },
                ) { Text("Photo") }
                OutlinedButton(onClick = { pickInsurancePdf.launch("application/pdf") }) {
                    Text("PDF")
                }
            }
        }

        Text("Payments", style = MaterialTheme.typography.titleMedium)
        if (state.payments.isEmpty()) {
            Text("No payments yet.", style = MaterialTheme.typography.bodyMedium)
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                state.payments.forEach { p ->
                    PaymentRow(p)
                }
            }
        }

        if (!state.canRecordPayments) {
            Text(
                "Recording payments requires an admin account.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        } else {
            Text("Record payment", style = MaterialTheme.typography.titleSmall)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                PAYMENT_METHODS.forEach { (value, label) ->
                    FilterChip(
                        selected = selectedMethod == value,
                        onClick = { selectedMethod = value },
                        label = { Text(label) },
                    )
                }
            }
            OutlinedTextField(
                value = amountText,
                onValueChange = { amountText = it },
                label = { Text("Amount") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = noteText,
                onValueChange = { noteText = it },
                label = { Text("Note (optional)") },
                modifier = Modifier.fillMaxWidth(),
            )
            viewModel.paymentError?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            Button(
                onClick = {
                    val amt = amountText.toDoubleOrNull()
                    if (amt != null && amt > 0) {
                        viewModel.recordPayment(amt, selectedMethod, noteText.takeIf { it.isNotBlank() })
                        amountText = ""
                        noteText = ""
                    }
                },
                enabled = amountText.toDoubleOrNull()?.let { it > 0 } == true && !viewModel.busy,
            ) {
                Text("Save payment")
            }
        }
    }
}

@Composable
private fun PaymentRow(p: BookingPaymentRowDto) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Text("$" + p.amount + " · " + p.method, style = MaterialTheme.typography.titleSmall)
            p.received_at?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
            p.note?.takeIf { it.isNotBlank() }?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
        }
    }
}
