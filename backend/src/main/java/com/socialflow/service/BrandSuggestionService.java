package com.socialflow.service;

import com.socialflow.dto.BrandSuggestionRequest;
import com.socialflow.dto.BrandSuggestionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class BrandSuggestionService {

    private static final Map<String, String> INDUSTRY_KEYWORDS = new HashMap<>();
    private static final Map<String, String[]> COLOR_PALETTE = new HashMap<>();

    static {
        // Industry detection based on keywords
        INDUSTRY_KEYWORDS.put("tech", "Technology");
        INDUSTRY_KEYWORDS.put("soft", "Technology");
        INDUSTRY_KEYWORDS.put("dev", "Technology");
        INDUSTRY_KEYWORDS.put("app", "Technology");
        INDUSTRY_KEYWORDS.put("digital", "Technology");
        INDUSTRY_KEYWORDS.put("shop", "E-commerce");
        INDUSTRY_KEYWORDS.put("store", "E-commerce");
        INDUSTRY_KEYWORDS.put("commerce", "E-commerce");
        INDUSTRY_KEYWORDS.put("market", "E-commerce");
        INDUSTRY_KEYWORDS.put("cafe", "Food & Beverage");
        INDUSTRY_KEYWORDS.put("restaurant", "Food & Beverage");
        INDUSTRY_KEYWORDS.put("food", "Food & Beverage");
        INDUSTRY_KEYWORDS.put("coffee", "Food & Beverage");
        INDUSTRY_KEYWORDS.put("beauty", "Beauty & Wellness");
        INDUSTRY_KEYWORDS.put("spa", "Beauty & Wellness");
        INDUSTRY_KEYWORDS.put("salon", "Beauty & Wellness");
        INDUSTRY_KEYWORDS.put("wellness", "Beauty & Wellness");
        INDUSTRY_KEYWORDS.put("gym", "Health & Fitness");
        INDUSTRY_KEYWORDS.put("fitness", "Health & Fitness");
        INDUSTRY_KEYWORDS.put("sports", "Sports");
        INDUSTRY_KEYWORDS.put("travel", "Travel & Tourism");
        INDUSTRY_KEYWORDS.put("hotel", "Travel & Tourism");
        INDUSTRY_KEYWORDS.put("education", "Education");
        INDUSTRY_KEYWORDS.put("school", "Education");
        INDUSTRY_KEYWORDS.put("university", "Education");
        INDUSTRY_KEYWORDS.put("estate", "Real Estate");
        INDUSTRY_KEYWORDS.put("property", "Real Estate");
        INDUSTRY_KEYWORDS.put("media", "Media & Entertainment");
        INDUSTRY_KEYWORDS.put("entertainment", "Media & Entertainment");
        INDUSTRY_KEYWORDS.put("music", "Media & Entertainment");
        INDUSTRY_KEYWORDS.put("finance", "Finance & Banking");
        INDUSTRY_KEYWORDS.put("bank", "Finance & Banking");
        INDUSTRY_KEYWORDS.put("invest", "Finance & Banking");
        INDUSTRY_KEYWORDS.put("consult", "Consulting");
        INDUSTRY_KEYWORDS.put("manage", "Consulting");
        
        // Color palettes for different industries
        COLOR_PALETTE.put("Technology", new String[]{"#0066FF", "#00D9FF"});          // Blue & Cyan
        COLOR_PALETTE.put("E-commerce", new String[]{"#FF6B35", "#F7931E"});          // Orange & Dark Orange
        COLOR_PALETTE.put("Food & Beverage", new String[]{"#D4145A", "#FBB03B"});     // Red & Gold
        COLOR_PALETTE.put("Beauty & Wellness", new String[]{"#C41E3A", "#FFB6C1"});   // Rose & Light Pink
        COLOR_PALETTE.put("Health & Fitness", new String[]{"#00A86B", "#FFA500"});    // Green & Orange
        COLOR_PALETTE.put("Sports", new String[]{"#000000", "#FF0000"});              // Black & Red
        COLOR_PALETTE.put("Travel & Tourism", new String[]{"#2E8B57", "#87CEEB"});    // Green & Sky Blue
        COLOR_PALETTE.put("Education", new String[]{"#003366", "#FFFFFF"});           // Navy & White
        COLOR_PALETTE.put("Real Estate", new String[]{"#8B4513", "#D2B48C"});         // Brown & Tan
        COLOR_PALETTE.put("Media & Entertainment", new String[]{"#9D4EDD", "#3A0CA3"}); // Purple
        COLOR_PALETTE.put("Finance & Banking", new String[]{"#004B87", "#FFD700"});   // Navy & Gold
        COLOR_PALETTE.put("Consulting", new String[]{"#1F4E78", "#44546A"});          // Navy & Gray
    }

    /**
     * Generate suggestions for brand fields based on brand name
     */
    public BrandSuggestionResponse generateSuggestions(BrandSuggestionRequest request) {
        String brandName = request.getBrandName().toLowerCase().trim();

        // Detect industry
        String industry = detectIndustry(brandName);

        // Get color palette for industry
        String[] colors = COLOR_PALETTE.getOrDefault(industry, new String[]{"#0066FF", "#666666"});

        // Generate slogan
        String slogan = generateSlogan(request.getBrandName(), industry);

        // Generate website domain suggestion
        String website = generateWebsiteSuggestion(request.getBrandName());

        return new BrandSuggestionResponse(
                slogan,
                industry,
                colors[0],
                colors[1],
                website
        );
    }

    /**
     * Detect industry from brand name
     */
    private String detectIndustry(String brandName) {
        String[] words = brandName.split("\\s+|-|_");

        for (String word : words) {
            for (Map.Entry<String, String> entry : INDUSTRY_KEYWORDS.entrySet()) {
                if (word.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
        }

        return "General";
    }

    /**
     * Generate a brand slogan based on name and industry
     */
    private String generateSlogan(String brandName, String industry) {
        Map<String, String[]> sloganTemplates = new HashMap<>();
        sloganTemplates.put("Technology", new String[]{
                "Innovate with " + brandName,
                "Where Technology Meets Excellence",
                "Powered by " + brandName,
                "Your Digital Partner"
        });
        sloganTemplates.put("E-commerce", new String[]{
                "Shop Smart with " + brandName,
                "Your Shopping Destination",
                "Quality Meets Affordability",
                "Shop Easy, Live Better"
        });
        sloganTemplates.put("Food & Beverage", new String[]{
                "Taste the Difference with " + brandName,
                "Flavor You Can Trust",
                "Savor Every Moment",
                "Quality & Taste in Every Bite"
        });
        sloganTemplates.put("Beauty & Wellness", new String[]{
                "Enhance Your Natural Beauty",
                "Wellness for Your Best Self",
                "Beauty from Within",
                "Transform Your Beauty"
        });
        sloganTemplates.put("Health & Fitness", new String[]{
                "Your Fitness Journey Starts Here",
                "Train Hard, Stay Healthy",
                "Build Your Best Self",
                "Fitness Made Easy"
        });
        sloganTemplates.put("Travel & Tourism", new String[]{
                "Explore the World with " + brandName,
                "Your Adventure Awaits",
                "Discover New Horizons",
                "Travel Beyond Limits"
        });
        sloganTemplates.put("Education", new String[]{
                "Learning for Tomorrow's Leaders",
                "Educate, Inspire, Empower",
                "Knowledge is Power",
                "Shaping Future Leaders"
        });

        String[] slogans = sloganTemplates.getOrDefault(industry, new String[]{
                "Excellence in " + industry,
                "Your Trusted " + industry + " Partner",
                "Quality & Innovation",
                "Excellence Delivered"
        });

        return slogans[(int) (System.currentTimeMillis() % slogans.length)];
    }

    /**
     * Generate website domain suggestion
     */
    private String generateWebsiteSuggestion(String brandName) {
        String domain = brandName.toLowerCase()
                .replaceAll("\\s+", "")
                .replaceAll("[^a-z0-9]", "");

        return "https://www." + domain + ".com";
    }
}
