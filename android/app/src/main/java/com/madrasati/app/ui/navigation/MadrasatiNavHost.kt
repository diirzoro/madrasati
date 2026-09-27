package com.madrasati.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.madrasati.app.di.AppContainer
import com.madrasati.app.ui.screens.AdmissionScreen
import com.madrasati.app.ui.screens.BookingScreen
import com.madrasati.app.ui.screens.HomeScreen
import com.madrasati.app.ui.screens.LoginScreen
import com.madrasati.app.ui.screens.MyApplicationsScreen
import com.madrasati.app.ui.screens.MyBookingsScreen
import com.madrasati.app.ui.screens.ProfileScreen
import com.madrasati.app.ui.screens.RegisterScreen
import com.madrasati.app.ui.screens.SchoolDetailScreen
import com.madrasati.app.ui.screens.SearchScreen
import com.madrasati.app.ui.screens.TeacherDetailScreen
import com.madrasati.app.ui.viewmodel.BookingKind
import com.madrasati.app.ui.viewmodel.BookingViewModel
import com.madrasati.app.ui.viewmodel.AdmissionViewModel
import com.madrasati.app.ui.viewmodel.SchoolDetailViewModel
import com.madrasati.app.ui.viewmodel.SearchTab
import com.madrasati.app.ui.viewmodel.SearchViewModel
import com.madrasati.app.ui.viewmodel.TeacherDetailViewModel
import com.madrasati.app.util.I18n

private data class BottomNavItem(
    val route: String,
    val labelKey: String,
    val icon: ImageVector,
)

private val bottomItems = listOf(
    BottomNavItem(Routes.HOME, "home", Icons.Filled.Home),
    BottomNavItem(Routes.SEARCH, "search", Icons.Filled.Search),
    BottomNavItem(Routes.PROFILE, "profile", Icons.Filled.Person),
)

private val topLevelRoutes = bottomItems.map { it.route }.toSet()

@Composable
fun MadrasatiNavHost(navController: NavHostController) {
    val container = AppContainer.get

    LaunchedEffect(Unit) {
        container.authRepository.refreshSession()
    }

    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute in topLevelRoutes

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    bottomItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(item.icon, contentDescription = I18n.t(item.labelKey)) },
                            label = { Text(I18n.t(item.labelKey)) },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Routes.HOME) {
                HomeScreen(
                    onSearch = { navController.navigate(Routes.SEARCH) },
                    onOpenSchool = { navController.navigate(Routes.school(it)) },
                    onOpenTeacher = { navController.navigate(Routes.teacher(it)) },
                    onSeeAllSchools = { navController.navigate(Routes.SEARCH) },
                    onSeeAllTeachers = { navController.navigate(Routes.SEARCH) },
                )
            }

            composable(Routes.SEARCH) {
                val vm: SearchViewModel = viewModel { SearchViewModel(container.catalogRepository) }
                SearchScreen(
                    vm = vm,
                    onOpenSchool = { navController.navigate(Routes.school(it)) },
                    onOpenTeacher = { navController.navigate(Routes.teacher(it)) },
                )
            }

            composable(Routes.PROFILE) {
                ProfileScreen(
                    onLogin = { navController.navigate(Routes.LOGIN) },
                    onRegister = { navController.navigate(Routes.REGISTER) },
                    onBookings = { navController.navigate(Routes.BOOKINGS) },
                    onApplications = { navController.navigate(Routes.APPLICATIONS) },
                )
            }

            composable(
                route = Routes.SCHOOL,
                arguments = listOf(navArgument("orgId") { type = NavType.StringType }),
            ) { entry ->
                val orgId = entry.arguments?.getString("orgId").orEmpty()
                val vm: SchoolDetailViewModel = viewModel {
                    SchoolDetailViewModel(container.catalogRepository, orgId)
                }
                SchoolDetailScreen(
                    vm = vm,
                    onBack = { navController.popBackStack() },
                    onBookVisit = { navController.navigate(Routes.booking("org", orgId)) },
                    onApply = { navController.navigate(Routes.admission(orgId)) },
                )
            }

            composable(
                route = Routes.TEACHER,
                arguments = listOf(navArgument("teacherId") { type = NavType.StringType }),
            ) { entry ->
                val teacherId = entry.arguments?.getString("teacherId").orEmpty()
                val vm: TeacherDetailViewModel = viewModel {
                    TeacherDetailViewModel(container.catalogRepository, teacherId)
                }
                TeacherDetailScreen(
                    vm = vm,
                    onBack = { navController.popBackStack() },
                    onBook = { navController.navigate(Routes.booking("teacher", teacherId)) },
                    onLogin = { navController.navigate(Routes.LOGIN) },
                )
            }

            composable(Routes.LOGIN) {
                LoginScreen(
                    onBack = { navController.popBackStack() },
                    onRegister = { navController.navigate(Routes.REGISTER) },
                    onLoggedIn = { navController.popBackStack() },
                )
            }

            composable(Routes.REGISTER) {
                RegisterScreen(
                    onBack = { navController.popBackStack() },
                    onLogin = { navController.navigate(Routes.LOGIN) },
                    onRegistered = { navController.popBackStack() },
                )
            }

            composable(Routes.BOOKINGS) {
                MyBookingsScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.APPLICATIONS) {
                MyApplicationsScreen(onBack = { navController.popBackStack() })
            }

            composable(
                route = Routes.BOOKING,
                arguments = listOf(
                    navArgument("kind") { type = NavType.StringType },
                    navArgument("id") { type = NavType.StringType },
                ),
            ) { entry ->
                val kind = entry.arguments?.getString("kind").orEmpty()
                val id = entry.arguments?.getString("id").orEmpty()
                val bookingKind = if (kind == "teacher") BookingKind.TEACHER else BookingKind.ORG
                val vm: BookingViewModel = viewModel {
                    BookingViewModel(container.catalogRepository, bookingKind, id)
                }
                BookingScreen(
                    vm = vm,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(
                route = Routes.ADMISSION,
                arguments = listOf(navArgument("orgId") { type = NavType.StringType }),
            ) { entry ->
                val orgId = entry.arguments?.getString("orgId").orEmpty()
                val vm: AdmissionViewModel = viewModel {
                    AdmissionViewModel(container.catalogRepository, orgId)
                }
                AdmissionScreen(
                    vm = vm,
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}
