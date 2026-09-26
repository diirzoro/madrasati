package com.madrasati.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.madrasati.app.data.model.HeroSlide
import com.madrasati.app.di.AppContainer
import com.madrasati.app.ui.components.ErrorState
import com.madrasati.app.ui.components.LoadingState
import com.madrasati.app.ui.components.OrgCard
import com.madrasati.app.ui.components.RemoteImage
import com.madrasati.app.ui.components.SectionHeader
import com.madrasati.app.ui.components.TeacherCard
import com.madrasati.app.ui.theme.Primary
import com.madrasati.app.ui.theme.PrimaryDark
import com.madrasati.app.ui.theme.Surface as BrandSurface
import com.madrasati.app.ui.theme.TextMuted
import com.madrasati.app.ui.viewmodel.HomeViewModel
import com.madrasati.app.util.Language
import com.madrasati.app.util.t

@Composable
fun HomeScreen(
    onSearch: () -> Unit,
    onOpenSchool: (String) -> Unit,
    onOpenTeacher: (String) -> Unit,
    onSeeAllSchools: () -> Unit,
    onSeeAllTeachers: () -> Unit,
) {
    val vm: HomeViewModel = viewModel { HomeViewModel(AppContainer.get.catalogRepository) }

    if (vm.loading) {
        LoadingState()
        return
    }
    if (vm.error != null && vm.orgs.isEmpty() && vm.teachers.isEmpty() && vm.slides.isEmpty()) {
        ErrorState(vm.error, onRetry = { vm.load() })
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 16.dp),
    ) {
        item { HomeTopBar(onSearch = onSearch) }

        if (vm.slides.isNotEmpty()) {
            item { HeroCarousel(vm.slides) }
        }

        if (vm.ads.isNotEmpty()) {
            item { TickerStrip(vm.ads.mapNotNull { it.messageAr ?: it.messageEn ?: it.name }) }
        }

        item {
            SectionHeader(title = t("schools"), onSeeAll = onSeeAllSchools)
        }
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(vm.orgs, key = { it.id }) { org ->
                    OrgCard(
                        org = org,
                        onClick = { onOpenSchool(org.id) },
                        modifier = Modifier.width(260.dp),
                    )
                }
            }
        }

        item {
            SectionHeader(title = t("teachers"), onSeeAll = onSeeAllTeachers)
        }
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(vm.teachers, key = { it.id }) { teacher ->
                    TeacherCard(
                        teacher = teacher,
                        onClick = { onOpenTeacher(teacher.id) },
                        modifier = Modifier.width(300.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeTopBar(onSearch: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(PrimaryDark)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = t("appName"),
            style = MaterialTheme.typography.headlineMedium,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = if (Language.isArabic) "EN" else "عربي",
            color = Color.White,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier
                .background(Color.White.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                .clickable { Language.toggle() }
                .padding(horizontal = 10.dp, vertical = 6.dp),
        )
        Spacer(Modifier.width(12.dp))
        Surface(
            onClick = onSearch,
            shape = RoundedCornerShape(24.dp),
            color = Color.White.copy(alpha = 0.14f),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Search, null, tint = Color.White, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@Composable
private fun HeroCarousel(slides: List<HeroSlide>) {
    val pagerState = rememberPagerState(pageCount = { slides.size })
    Column {
        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxWidth()) { page ->
            HeroSlideCard(slides[page])
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(slides.size) { index ->
                val active = pagerState.currentPage == index
                Box(
                    modifier = Modifier
                        .padding(horizontal = 3.dp)
                        .size(if (active) 8.dp else 6.dp)
                        .background(
                            color = if (active) Primary else TextMuted.copy(alpha = 0.4f),
                            shape = RoundedCornerShape(4.dp),
                        ),
                )
            }
        }
    }
}

@Composable
private fun HeroSlideCard(slide: HeroSlide) {
    val title = if (Language.isArabic) slide.titleAr else slide.titleEn
    val subtitle = if (Language.isArabic) slide.subtitleAr else slide.subtitleEn
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .height(170.dp),
    ) {
        RemoteImage(
            url = slide.image,
            contentDescription = title,
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(16.dp),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.35f), RoundedCornerShape(16.dp)),
        )
        Column(
            modifier = Modifier.align(Alignment.BottomStart).padding(16.dp),
        ) {
            if (!title.isNullOrBlank()) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                )
            }
            if (!subtitle.isNullOrBlank()) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.9f),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun TickerStrip(messages: List<String>) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(messages) { message ->
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = androidx.compose.material3.CardDefaults.cardColors(
                    containerColor = Primary.copy(alpha = 0.1f),
                ),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Campaign, null, tint = Primary, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = message,
                        style = MaterialTheme.typography.labelMedium,
                        color = Primary,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}
