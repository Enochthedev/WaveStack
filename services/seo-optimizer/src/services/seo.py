"""
SEO Optimization Service
AI-powered SEO optimization for content
"""
import logging
import re
from typing import Dict, List, Any, Optional
import httpx
import textstat
from redis import Redis

logger = logging.getLogger(__name__)


class SEOService:
    def __init__(self, redis: Redis, ai_url: str, openai_key: str = ""):
        self.redis = redis
        self.ai_url = ai_url
        self.openai_key = openai_key
        self.logger = logger

    async def optimize_title(self, title: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize title for SEO and engagement"""
        suggestions = []

        # Check length
        if len(title) > 60:
            suggestions.append({
                "type": "length",
                "issue": f"Title too long ({len(title)} chars)",
                "recommendation": "Keep title under 60 characters for optimal display",
            })

        # Check for power words
        power_words = ["ultimate", "complete", "best", "top", "guide", "how to", "free", "new", "proven"]
        has_power_word = any(word.lower() in title.lower() for word in power_words)

        if not has_power_word:
            suggestions.append({
                "type": "power_words",
                "issue": "No power words detected",
                "recommendation": f"Consider adding words like: {', '.join(power_words[:5])}",
            })

        # Check for numbers
        has_number = bool(re.search(r'\d+', title))
        if not has_number:
            suggestions.append({
                "type": "numbers",
                "issue": "No numbers in title",
                "recommendation": "Titles with numbers tend to perform better (e.g., '5 Tips', 'Top 10')",
            })

        # Generate AI-optimized title
        optimized_title = await self._generate_optimized_title(title, context)

        return {
            "original": title,
            "optimized": optimized_title,
            "length": len(title),
            "suggestions": suggestions,
            "score": self._calculate_title_score(title),
        }

    async def optimize_description(self, description: str, keywords: List[str]) -> Dict[str, Any]:
        """Optimize description for SEO"""
        suggestions = []

        # Check length
        if len(description) < 100:
            suggestions.append({
                "type": "length",
                "issue": "Description too short",
                "recommendation": "Aim for 150-300 characters for better SEO",
            })
        elif len(description) > 300:
            suggestions.append({
                "type": "length",
                "issue": "Description might be too long",
                "recommendation": "Keep around 150-300 characters for search snippets",
            })

        # Check keyword presence
        keywords_found = [kw for kw in keywords if kw.lower() in description.lower()]
        keywords_missing = [kw for kw in keywords if kw.lower() not in description.lower()]

        if keywords_missing:
            suggestions.append({
                "type": "keywords",
                "issue": f"Missing keywords: {', '.join(keywords_missing)}",
                "recommendation": "Include primary keywords naturally in description",
            })

        # Check readability
        readability = textstat.flesch_reading_ease(description)
        if readability < 60:
            suggestions.append({
                "type": "readability",
                "issue": f"Readability score: {readability:.1f} (difficult)",
                "recommendation": "Simplify language for better readability",
            })

        # Generate optimized description
        optimized_desc = await self._generate_optimized_description(description, keywords)

        return {
            "original": description,
            "optimized": optimized_desc,
            "length": len(description),
            "readability_score": readability,
            "keywords_found": keywords_found,
            "keywords_missing": keywords_missing,
            "suggestions": suggestions,
            "score": self._calculate_description_score(description, keywords),
        }

    async def generate_tags(self, content: str, max_tags: int = 30) -> List[str]:
        """Generate SEO-optimized tags"""
        # Use AI to generate relevant tags
        tags = await self._ai_generate_tags(content, max_tags)

        # Add trending tags
        trending = await self._get_trending_tags()
        relevant_trending = [tag for tag in trending if any(word in content.lower() for word in tag.lower().split())]

        # Combine and deduplicate
        all_tags = list(set(tags + relevant_trending[:5]))

        return all_tags[:max_tags]

    async def research_keywords(self, topic: str, platform: str = "youtube") -> List[Dict[str, Any]]:
        """Research keywords for a topic"""
        keywords = []

        # Generate seed keywords
        seed_keywords = await self._generate_seed_keywords(topic)

        # For each seed keyword, get related keywords
        for seed in seed_keywords:
            related = await self._get_related_keywords(seed, platform)
            keywords.extend(related)

        # Deduplicate and sort by search volume (estimated)
        unique_keywords = {}
        for kw in keywords:
            keyword_text = kw["keyword"]
            if keyword_text not in unique_keywords:
                unique_keywords[keyword_text] = kw

        sorted_keywords = sorted(
            unique_keywords.values(),
            key=lambda x: x.get("search_volume", 0),
            reverse=True
        )

        return sorted_keywords[:50]

    async def analyze_competition(self, keyword: str, platform: str = "youtube") -> Dict[str, Any]:
        """Analyze competition for a keyword"""
        # This would integrate with YouTube Data API or similar
        return {
            "keyword": keyword,
            "competition": "medium",  # low, medium, high
            "search_volume": "10K-100K",  # estimated
            "difficulty_score": 65,  # 0-100
            "top_creators": [],
            "content_gaps": [],
            "recommendations": [
                "Consider long-tail variations",
                "Focus on unique angles",
                "Add specific details to stand out",
            ],
        }

    async def optimize_content(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive SEO optimization"""
        title = content_data.get("title", "")
        description = content_data.get("description", "")
        content = content_data.get("content", "")
        platform = content_data.get("platform", "youtube")

        # Research keywords
        keywords_data = await self.research_keywords(title, platform)
        top_keywords = [kw["keyword"] for kw in keywords_data[:5]]

        # Optimize title
        title_optimization = await self.optimize_title(title, content_data)

        # Optimize description
        desc_optimization = await self.optimize_description(description, top_keywords)

        # Generate tags
        tags = await self.generate_tags(f"{title} {description} {content}")

        # Calculate overall SEO score
        seo_score = self._calculate_seo_score({
            "title": title_optimization["score"],
            "description": desc_optimization["score"],
            "tags": min(len(tags) / 30 * 100, 100),
        })

        return {
            "seo_score": seo_score,
            "title": title_optimization,
            "description": desc_optimization,
            "keywords": keywords_data[:10],
            "tags": tags,
            "recommendations": self._generate_recommendations(seo_score, title_optimization, desc_optimization),
        }

    # Helper methods
    async def _generate_optimized_title(self, title: str, context: Dict[str, Any]) -> str:
        """Generate AI-optimized title"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ai_url}/api/v1/personality/optimize-title",
                    json={
                        "title": title,
                        "context": context,
                        "max_length": 60,
                        "include_power_words": True,
                    },
                    timeout=30.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("optimized_title", title)
        except Exception as e:
            self.logger.error(f"Error generating optimized title: {e}")

        return title

    async def _generate_optimized_description(self, description: str, keywords: List[str]) -> str:
        """Generate AI-optimized description"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ai_url}/api/v1/personality/optimize-description",
                    json={
                        "description": description,
                        "keywords": keywords,
                        "max_length": 300,
                        "platform": "youtube",
                    },
                    timeout=30.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("optimized_description", description)
        except Exception as e:
            self.logger.error(f"Error generating optimized description: {e}")

        return description

    async def _ai_generate_tags(self, content: str, max_tags: int) -> List[str]:
        """Use AI to generate relevant tags"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ai_url}/api/v1/personality/generate-tags",
                    json={
                        "content": content,
                        "count": max_tags,
                        "platform": "youtube",
                    },
                    timeout=30.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("tags", [])
        except Exception as e:
            self.logger.error(f"Error generating tags: {e}")

        return []

    async def _get_trending_tags(self) -> List[str]:
        """Get currently trending tags"""
        # Would fetch from cache/database
        return ["gaming", "tutorial", "2024", "howto", "tips", "guide", "review"]

    async def _generate_seed_keywords(self, topic: str) -> List[str]:
        """Generate seed keywords from topic"""
        # Use AI to expand topic into keywords
        keywords = [topic]

        # Add variations
        words = topic.split()
        if len(words) > 1:
            keywords.extend(words)

        # Add common modifiers
        modifiers = ["how to", "best", "top", "tutorial", "guide", "tips", "tricks", "review"]
        keywords.extend([f"{mod} {topic}" for mod in modifiers])

        return keywords

    async def _get_related_keywords(self, keyword: str, platform: str) -> List[Dict[str, Any]]:
        """Get related keywords"""
        # This would use YouTube autocomplete API or keyword tools
        # Simplified for now
        return [
            {"keyword": keyword, "search_volume": 10000, "competition": "medium"},
            {"keyword": f"{keyword} tutorial", "search_volume": 5000, "competition": "low"},
            {"keyword": f"how to {keyword}", "search_volume": 8000, "competition": "medium"},
            {"keyword": f"best {keyword}", "search_volume": 6000, "competition": "high"},
        ]

    def _calculate_title_score(self, title: str) -> float:
        """Calculate title SEO score (0-100)"""
        score = 100.0

        # Length penalty
        if len(title) > 60:
            score -= min((len(title) - 60) * 2, 30)
        elif len(title) < 30:
            score -= (30 - len(title))

        # Power words bonus
        power_words = ["ultimate", "complete", "best", "top", "guide", "how to", "free"]
        if any(word in title.lower() for word in power_words):
            score += 10

        # Number bonus
        if re.search(r'\d+', title):
            score += 5

        return max(0, min(100, score))

    def _calculate_description_score(self, description: str, keywords: List[str]) -> float:
        """Calculate description SEO score (0-100)"""
        score = 100.0

        # Length scoring
        if 150 <= len(description) <= 300:
            score += 10
        elif len(description) < 100:
            score -= 20
        elif len(description) > 500:
            score -= 10

        # Keyword presence
        keywords_found = sum(1 for kw in keywords if kw.lower() in description.lower())
        keyword_score = (keywords_found / max(len(keywords), 1)) * 30
        score += keyword_score

        # Readability
        readability = textstat.flesch_reading_ease(description)
        if readability >= 60:
            score += 10
        elif readability < 40:
            score -= 10

        return max(0, min(100, score))

    def _calculate_seo_score(self, component_scores: Dict[str, float]) -> float:
        """Calculate overall SEO score"""
        weights = {
            "title": 0.4,
            "description": 0.3,
            "tags": 0.3,
        }

        weighted_score = sum(
            component_scores.get(component, 0) * weight
            for component, weight in weights.items()
        )

        return round(weighted_score, 1)

    def _generate_recommendations(
        self,
        seo_score: float,
        title_optimization: Dict,
        desc_optimization: Dict
    ) -> List[str]:
        """Generate actionable SEO recommendations"""
        recommendations = []

        if seo_score < 70:
            recommendations.append("📈 SEO score needs improvement. Follow suggestions below.")

        # Title recommendations
        if title_optimization["score"] < 80:
            recommendations.append("✍️ Use optimized title for better SEO")
            if title_optimization["suggestions"]:
                recommendations.append(f"  → {title_optimization['suggestions'][0]['recommendation']}")

        # Description recommendations
        if desc_optimization["score"] < 80:
            recommendations.append("📝 Improve description with suggested optimizations")
            if desc_optimization["suggestions"]:
                recommendations.append(f"  → {desc_optimization['suggestions'][0]['recommendation']}")

        # Keyword recommendations
        if desc_optimization.get("keywords_missing"):
            recommendations.append(f"🔑 Add missing keywords: {', '.join(desc_optimization['keywords_missing'][:3])}")

        if seo_score >= 90:
            recommendations.append("🎉 Excellent SEO! Your content is well-optimized.")

        return recommendations
