package com.nextgearauto.admin.navigation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.nextgearauto.admin.LocalAppGraph
import com.nextgearauto.admin.ui.bookingdetail.BookingDetailScreen
import com.nextgearauto.admin.ui.bookingdetail.BookingDetailViewModel
import com.nextgearauto.admin.ui.bookings.BookingsListContent
import com.nextgearauto.admin.ui.bookings.BookingsViewModel
import com.nextgearauto.admin.ui.calendar.CalendarScreen
import com.nextgearauto.admin.ui.calendar.CalendarViewModel
import com.nextgearauto.admin.ui.maintenance.MaintenancePlaceholderScreen
import com.nextgearauto.admin.ui.payments.PaymentsOverviewScreen
import com.nextgearauto.admin.ui.today.TodayScreen
import com.nextgearauto.admin.ui.today.TodayViewModel
import com.nextgearauto.admin.ui.vehicles.VehiclesScreen
import com.nextgearauto.admin.ui.vehicles.VehiclesViewModel

private sealed class MainTab(val route: String, val label: String) {
    data object Today : MainTab("today", "Today")
    data object Bookings : MainTab("bookings", "Bookings")
    data object Calendar : MainTab("calendar", "Week")
    data object More : MainTab("more", "More")
}

private val tabs =
    listOf(MainTab.Today, MainTab.Bookings, MainTab.Calendar, MainTab.More)

private const val ROUTE_BOOKING_DETAIL = "booking_detail/{bookingId}"
private const val ROUTE_VEHICLES = "vehicles"
private const val ROUTE_MAINTENANCE = "maintenance"

@Composable
fun AdminAppShell(onLogout: () -> Unit) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route.orEmpty()
    val showBottomBar =
        !currentRoute.startsWith("booking_detail") &&
            currentRoute != ROUTE_VEHICLES &&
            currentRoute != ROUTE_MAINTENANCE

    Scaffold(
        bottomBar = {
            if (!showBottomBar) return@Scaffold
            val current = navBackStackEntry?.destination
            NavigationBar {
                tabs.forEach { tab ->
                    val selected = current?.hierarchy?.any { it.route == tab.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(tab.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = when (tab) {
                                    MainTab.Today -> Icons.Default.DateRange
                                    MainTab.Bookings -> Icons.Default.List
                                    MainTab.Calendar -> Icons.Default.Schedule
                                    MainTab.More -> Icons.Default.Build
                                },
                                contentDescription = tab.label,
                            )
                        },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = MainTab.Today.route,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(MainTab.Today.route) {
                val graph = LocalAppGraph.current
                val vm: TodayViewModel = viewModel(factory = TodayViewModel.Factory(graph.api))
                LaunchedEffect(Unit) { vm.load() }
                TodayScreen(
                    state = vm.uiState,
                    onRetry = { vm.load() },
                    onBookingClick = { id ->
                        navController.navigate("booking_detail/$id")
                    },
                )
            }
            composable(MainTab.Bookings.route) {
                val graph = LocalAppGraph.current
                val vm: BookingsViewModel = viewModel(factory = BookingsViewModel.Factory(graph.api))
                LaunchedEffect(Unit) { vm.load() }
                BookingsListContent(
                    state = vm.uiState,
                    onRetry = { vm.load() },
                    onBookingClick = { id -> navController.navigate("booking_detail/$id") },
                )
            }
            composable(MainTab.Calendar.route) {
                val graph = LocalAppGraph.current
                val vm: CalendarViewModel = viewModel(factory = CalendarViewModel.Factory(graph.api))
                LaunchedEffect(Unit) { vm.load() }
                CalendarScreen(
                    state = vm.uiState,
                    onRetry = { vm.load() },
                    onBookingClick = { id -> navController.navigate("booking_detail/$id") },
                )
            }
            composable(MainTab.More.route) {
                val scroll = rememberScrollState()
                Column(
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(scroll)
                        .padding(horizontal = 24.dp)
                        .padding(top = 24.dp, bottom = 32.dp),
                ) {
                    Text("More", style = MaterialTheme.typography.headlineSmall)
                    Text(
                        "Payments overview (same figures as the former Payments tab).",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                    PaymentsOverviewScreen(modifier = Modifier.padding(top = 16.dp))
                    Text(
                        "Upload ID and insurance from booking detail when viewing a reservation.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 24.dp),
                    )
                    OutlinedButton(
                        onClick = { navController.navigate(ROUTE_VEHICLES) },
                        modifier = Modifier.padding(top = 16.dp),
                    ) {
                        Text("Vehicles (fleet list)")
                    }
                    OutlinedButton(
                        onClick = { navController.navigate(ROUTE_MAINTENANCE) },
                        modifier = Modifier.padding(top = 8.dp),
                    ) {
                        Text("Maintenance (web parity roadmap)")
                    }
                    Button(
                        onClick = onLogout,
                        modifier = Modifier.padding(top = 24.dp),
                    ) {
                        Text("Log out")
                    }
                }
            }
            composable(ROUTE_VEHICLES) {
                val graph = LocalAppGraph.current
                val vm: VehiclesViewModel = viewModel(factory = VehiclesViewModel.Factory(graph.api))
                LaunchedEffect(Unit) { vm.load() }
                VehiclesScreen(
                    state = vm.uiState,
                    onRetry = { vm.load() },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(ROUTE_MAINTENANCE) {
                MaintenancePlaceholderScreen(onBack = { navController.popBackStack() })
            }
            composable(
                route = ROUTE_BOOKING_DETAIL,
                arguments = listOf(
                    navArgument("bookingId") { type = NavType.StringType },
                ),
            ) { entry ->
                val bookingId = entry.arguments?.getString("bookingId") ?: return@composable
                val graph = LocalAppGraph.current
                val vm: BookingDetailViewModel = viewModel(
                    key = bookingId,
                    factory = BookingDetailViewModel.Factory(bookingId, graph.api, graph.tokenStore),
                )
                BookingDetailScreen(
                    viewModel = vm,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}
