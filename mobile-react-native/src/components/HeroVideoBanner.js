import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { COLORS } from "../theme";
import { isVideoUrl, optimizeImageUrl } from "../utils/imageOptimizer";

const BANNER_HEIGHT = 420;

export default function HeroVideoBanner({ banners = [], onBannerPress }) {
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = windowWidth;

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);
  const videoRef = useRef(null);

  const activeBanners =
    banners.length > 0
      ? banners
      : [
          {
            id: "b1",
            title1: "VRAJ",
            title2: "SAIAAGAMAN",
            subtitle: "Exclusive Showcase",
            tagline: "Unveiling Modern Elegance & Luxury",
            mediaUrl:
              "https://res.cloudinary.com/dkdvivii2/video/upload/v1787133318/hero_banners/ewk8rjcbmdzorgdtdkyj.mp4",
            mediaType: "video",
            tag: "ATELIER 2026",
          },
        ];

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];
  const isCurrentVideo = isVideoUrl(currentBanner?.mediaUrl || currentBanner?.video);

  useEffect(() => {
    if (activeBanners.length <= 1 || isCurrentVideo) return;

    const timer = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % activeBanners.length;
      scrollToIndex(nextIndex);
    }, 4500);

    return () => clearTimeout(timer);
  }, [currentIndex, isCurrentVideo, activeBanners.length]);

  const scrollToIndex = (index) => {
    setCurrentIndex(index);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: index * slideWidth, animated: true });
    }
  };

  const handleVideoPlaybackStatus = (status) => {
    if (status.didJustFinish && activeBanners.length > 1) {
      const nextIndex = (currentIndex + 1) % activeBanners.length;
      scrollToIndex(nextIndex);
    }
  };

  const handleScrollEnd = (e) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / slideWidth);
    if (index !== currentIndex && index >= 0 && index < activeBanners.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {activeBanners.map((banner, index) => {
          const media = banner.mediaUrl || banner.video || banner.image || banner.imageUrl || "";
          const isVideo = isVideoUrl(media);
          const isCurrent = index === currentIndex;

          return (
            <View key={banner.id || index} style={[styles.slide, { width: slideWidth }]}>
              {isVideo ? (
                <Video
                  ref={isCurrent ? videoRef : null}
                  source={{ uri: media }}
                  style={styles.media}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={isCurrent}
                  isLooping={activeBanners.length === 1}
                  isMuted={true}
                  onPlaybackStatusUpdate={isCurrent ? handleVideoPlaybackStatus : undefined}
                />
              ) : (
                <Image
                  source={{ uri: optimizeImageUrl(media, 1080) }}
                  style={styles.media}
                  resizeMode="cover"
                />
              )}

              <View style={styles.scrim} />

              <View style={styles.content}>
                <View style={styles.tagBadge}>
                  <Text style={styles.tagText}>
                    ✨ {banner.tag || banner.subtitle || "EXCLUSIVE SHOWCASE"}
                  </Text>
                </View>

                <Text style={styles.title1}>{banner.title1 || "VRAJ"}</Text>
                <Text style={styles.title2}>{banner.title2 || "SAIAAGAMAN"}</Text>

                {!!banner.tagline && <Text style={styles.tagline}>{banner.tagline}</Text>}

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => onBannerPress && onBannerPress(banner)}
                  style={styles.ctaButton}
                >
                  <Text style={styles.ctaText}>EXPLORE COUTURE</Text>
                  <Text style={styles.ctaArrow}> →</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {activeBanners.length > 1 && (
        <View style={styles.indicatorContainer}>
          <View style={styles.dotsRow}>
            {activeBanners.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {activeBanners.length}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_HEIGHT,
    backgroundColor: "#07070A",
  },
  slide: {
    height: BANNER_HEIGHT,
    position: "relative",
  },
  media: {
    width: "100%",
    height: "100%",
    backgroundColor: "#101014",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  content: {
    position: "absolute",
    bottom: 34,
    left: 18,
    right: 18,
  },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.5)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginBottom: 6,
  },
  tagText: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title1: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  title2: {
    color: COLORS.goldLight,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: -4,
  },
  tagline: {
    color: "#E4E4E7",
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 16,
  },
  ctaButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gold,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  ctaText: {
    color: "#000000",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  ctaArrow: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "bold",
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 12,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 3.5,
    borderRadius: 2,
  },
  activeDot: {
    width: 20,
    backgroundColor: COLORS.goldLight,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  counterPill: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  counterText: {
    color: COLORS.goldLight,
    fontSize: 9.5,
    fontWeight: "700",
  },
});
