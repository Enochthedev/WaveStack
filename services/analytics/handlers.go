package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Overview returns comprehensive analytics
func getOverview(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	if orgID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id required"})
	}

	timeframe := c.Query("timeframe", "7d")
	days := parseTimeframe(timeframe)

	// Check cache first
	cacheKey := fmt.Sprintf("cache:analytics:overview:%s:%s", orgID, timeframe)
	if cached, err := redisClient.Get(ctx, cacheKey).Result(); err == nil {
		var data map[string]interface{}
		json.Unmarshal([]byte(cached), &data)
		return c.JSON(data)
	}

	// Fetch metrics concurrently using goroutines
	type result struct {
		key   string
		value map[string]interface{}
		err   error
	}

	results := make(chan result, 6)

	// Launch concurrent goroutines for each metric category
	go func() {
		content, err := getContentMetrics(orgID, days)
		results <- result{"content", content, err}
	}()

	go func() {
		engagement, err := getEngagementMetrics(orgID, days)
		results <- result{"engagement", engagement, err}
	}()

	go func() {
		growth, err := getGrowthMetrics(orgID, days)
		results <- result{"growth", growth, err}
	}()

	go func() {
		platforms, err := getPlatformMetrics(orgID, days)
		results <- result{"platforms", platforms, err}
	}()

	go func() {
		moderation, err := getModerationMetrics(orgID, days)
		results <- result{"moderation", moderation, err}
	}()

	go func() {
		revenue, err := getRevenueMetrics(orgID, days)
		results <- result{"revenue", revenue, err}
	}()

	// Collect results
	overview := make(map[string]interface{})
	for i := 0; i < 6; i++ {
		result := <-results
		if result.err == nil {
			overview[result.key] = result.value
		}
	}

	overview["timeframe"] = timeframe
	overview["updated_at"] = time.Now().Format(time.RFC3339)

	// Cache the result
	data, _ := json.Marshal(overview)
	redisClient.Set(ctx, cacheKey, data, config.CacheTTL)

	return c.JSON(overview)
}

// getTrends returns time-series data for a metric
func getTrends(c *fiber.Ctx, config *Config) error {
	metric := c.Params("metric")
	orgID := c.Query("org_id")
	timeframe := c.Query("timeframe", "30d")

	if orgID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id required"})
	}

	days := parseTimeframe(timeframe)
	trends := make([]map[string]interface{}, 0, days)

	// Fetch data for each day concurrently
	type dayData struct {
		date  string
		value float64
	}

	dataChan := make(chan dayData, days)

	for i := 0; i < days; i++ {
		day := i
		go func() {
			date := time.Now().AddDate(0, 0, -days+day+1).Format("2006-01-02")
			key := fmt.Sprintf("%s:%s:%s", metric, orgID, date)
			value, _ := redisClient.Get(ctx, key).Float64()
			dataChan <- dayData{date, value}
		}()
	}

	// Collect results
	for i := 0; i < days; i++ {
		data := <-dataChan
		trends = append(trends, map[string]interface{}{
			"date":  data.date,
			"value": data.value,
		})
	}

	return c.JSON(fiber.Map{
		"metric":    metric,
		"timeframe": timeframe,
		"data":      trends,
	})
}

// getTopContent returns top performing content
func getTopContent(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	if orgID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id required"})
	}

	// Get top content from sorted set
	key := fmt.Sprintf("content:%s:all", orgID)
	results, err := redisClient.ZRevRangeWithScores(ctx, key, 0, int64(limit-1)).Result()

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch top content"})
	}

	topContent := make([]map[string]interface{}, 0, len(results))
	for _, z := range results {
		topContent = append(topContent, map[string]interface{}{
			"content_id": z.Member,
			"score":      z.Score,
		})
	}

	return c.JSON(fiber.Map{
		"top_content": topContent,
		"count":       len(topContent),
	})
}

// trackEvent tracks an analytics event
func trackEvent(c *fiber.Ctx, config *Config) error {
	var event struct {
		EventType string                 `json:"event_type"`
		EventData map[string]interface{} `json:"event_data"`
	}

	if err := c.BodyParser(&event); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	orgID := c.Query("org_id")
	if orgID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "org_id required"})
	}

	timestamp := time.Now()
	dateKey := timestamp.Format("2006-01-02")
	hourKey := timestamp.Format("2006-01-02:15")

	// Increment counters using pipeline for performance
	pipe := redisClient.Pipeline()
	pipe.Incr(ctx, fmt.Sprintf("%s:%s:%s", event.EventType, orgID, dateKey))
	pipe.Incr(ctx, fmt.Sprintf("%s:%s:%s", event.EventType, orgID, hourKey))

	// Store event data
	eventKey := fmt.Sprintf("event:%s:%s:%s", orgID, event.EventType, timestamp.Format(time.RFC3339))
	eventJSON, _ := json.Marshal(event.EventData)
	pipe.Set(ctx, eventKey, eventJSON, time.Hour*24*time.Duration(config.MetricsRetention))

	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to track event"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Event tracked successfully",
	})
}

// Helper functions for getting specific metric categories
func getContentMetrics(orgID string, days int) (map[string]interface{}, error) {
	totalVideos := countMetric(fmt.Sprintf("content:%s:videos", orgID), days)
	totalClips := countMetric(fmt.Sprintf("content:%s:clips", orgID), days)
	totalPosts := countMetric(fmt.Sprintf("content:%s:posts", orgID), days)

	return map[string]interface{}{
		"total_videos":    totalVideos,
		"total_clips":     totalClips,
		"total_posts":     totalPosts,
		"publishing_freq": float64(totalPosts) / float64(days),
	}, nil
}

func getEngagementMetrics(orgID string, days int) (map[string]interface{}, error) {
	views := sumMetric(fmt.Sprintf("engagement:%s:views", orgID), days)
	likes := sumMetric(fmt.Sprintf("engagement:%s:likes", orgID), days)
	comments := sumMetric(fmt.Sprintf("engagement:%s:comments", orgID), days)
	shares := sumMetric(fmt.Sprintf("engagement:%s:shares", orgID), days)

	engagementRate := 0.0
	if views > 0 {
		engagementRate = ((likes + comments + shares) / views) * 100
	}

	return map[string]interface{}{
		"total_views":      views,
		"total_likes":      likes,
		"total_comments":   comments,
		"total_shares":     shares,
		"engagement_rate":  engagementRate,
	}, nil
}

func getGrowthMetrics(orgID string, days int) (map[string]interface{}, error) {
	currentFollowers := getCurrentValue(fmt.Sprintf("growth:%s:followers", orgID))

	return map[string]interface{}{
		"current_followers": currentFollowers,
		"growth_rate":       5.2, // Placeholder
		"new_followers":     150,
	}, nil
}

func getPlatformMetrics(orgID string, days int) (map[string]interface{}, error) {
	platforms := []string{"youtube", "twitch", "instagram", "tiktok", "facebook", "linkedin"}
	metrics := make(map[string]interface{})

	for _, platform := range platforms {
		posts := countMetric(fmt.Sprintf("platform:%s:%s:posts", orgID, platform), days)
		views := sumMetric(fmt.Sprintf("platform:%s:%s:views", orgID, platform), days)

		metrics[platform] = map[string]interface{}{
			"posts": posts,
			"views": views,
		}
	}

	return metrics, nil
}

func getModerationMetrics(orgID string, days int) (map[string]interface{}, error) {
	checked := countMetric(fmt.Sprintf("moderation:%s:checked", orgID), days)
	deleted := countMetric(fmt.Sprintf("moderation:%s:deleted", orgID), days)

	safetyScore := 100.0
	if checked > 0 {
		safetyScore = ((float64(checked) - float64(deleted)) / float64(checked)) * 100
	}

	return map[string]interface{}{
		"messages_checked": checked,
		"messages_deleted": deleted,
		"safety_score":     safetyScore,
	}, nil
}

func getRevenueMetrics(orgID string, days int) (map[string]interface{}, error) {
	totalRevenue := sumMetric(fmt.Sprintf("revenue:%s:total", orgID), days)
	adRevenue := sumMetric(fmt.Sprintf("revenue:%s:ads", orgID), days)

	return map[string]interface{}{
		"total_revenue": totalRevenue,
		"ad_revenue":    adRevenue,
	}, nil
}

// Endpoint wrappers
func getPlatforms(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	timeframe := c.Query("timeframe", "7d")
	days := parseTimeframe(timeframe)

	metrics, _ := getPlatformMetrics(orgID, days)
	return c.JSON(metrics)
}

func getEngagement(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	timeframe := c.Query("timeframe", "7d")
	days := parseTimeframe(timeframe)

	metrics, _ := getEngagementMetrics(orgID, days)
	return c.JSON(metrics)
}

func getGrowth(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	timeframe := c.Query("timeframe", "7d")
	days := parseTimeframe(timeframe)

	metrics, _ := getGrowthMetrics(orgID, days)
	return c.JSON(metrics)
}

func getRevenue(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	timeframe := c.Query("timeframe", "7d")
	days := parseTimeframe(timeframe)

	metrics, _ := getRevenueMetrics(orgID, days)
	return c.JSON(metrics)
}

func getModeration(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	timeframe := c.Query("timeframe", "7d")
	days := parseTimeframe(timeframe)

	metrics, _ := getModerationMetrics(orgID, days)
	return c.JSON(metrics)
}

func getRealtime(c *fiber.Ctx, config *Config) error {
	orgID := c.Query("org_id")
	metricType := c.Query("metric_type", "")

	key := fmt.Sprintf("realtime:%s:%s", orgID, metricType)
	events, _ := redisClient.LRange(ctx, key, 0, 99).Result()

	return c.JSON(fiber.Map{
		"org_id":      orgID,
		"metric_type": metricType,
		"events":      events,
		"timestamp":   time.Now().Format(time.RFC3339),
	})
}

// Utility functions
func parseTimeframe(timeframe string) int {
	if len(timeframe) < 2 {
		return 7
	}

	value, _ := strconv.Atoi(timeframe[:len(timeframe)-1])
	unit := timeframe[len(timeframe)-1:]

	switch unit {
	case "d":
		return value
	case "w":
		return value * 7
	case "m":
		return value * 30
	default:
		return 7
	}
}

func countMetric(key string, days int) int64 {
	var total int64
	for i := 0; i < days; i++ {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		dateKey := fmt.Sprintf("%s:%s", key, date)
		val, _ := redisClient.Get(ctx, dateKey).Int64()
		total += val
	}
	return total
}

func sumMetric(key string, days int) float64 {
	var total float64
	for i := 0; i < days; i++ {
		date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		dateKey := fmt.Sprintf("%s:%s", key, date)
		val, _ := redisClient.Get(ctx, dateKey).Float64()
		total += val
	}
	return total
}

func getCurrentValue(key string) int64 {
	val, _ := redisClient.Get(ctx, key).Int64()
	return val
}
