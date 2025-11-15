package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
)

type Config struct {
	Port              string
	RedisURL          string
	CacheTTL          time.Duration
	MetricsRetention  int
}

func loadConfig() *Config {
	godotenv.Load()

	return &Config{
		Port:             getEnv("PORT", "8800"),
		RedisURL:         getEnv("REDIS_URL", "redis://redis:6379"),
		CacheTTL:         time.Duration(getEnvInt("CACHE_TTL_SECONDS", 300)) * time.Second,
		MetricsRetention: getEnvInt("METRICS_RETENTION_DAYS", 90),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		var intVal int
		fmt.Sscanf(value, "%d", &intVal)
		return intVal
	}
	return fallback
}

func initRedis(config *Config) error {
	opt, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		return err
	}

	redisClient = redis.NewClient(opt)

	// Test connection
	_, err = redisClient.Ping(ctx).Result()
	return err
}

func main() {
	config := loadConfig()

	// Initialize Redis
	if err := initRedis(config); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("✅ Connected to Redis")

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:               "WaveStack Analytics Dashboard (Go)",
		DisableStartupMessage: false,
		Prefork:               false, // Set to true for multi-core production
		ServerHeader:          "WaveStack",
		StrictRouting:         false,
		CaseSensitive:        false,
		ReadTimeout:          time.Second * 10,
		WriteTimeout:         time.Second * 10,
		IdleTimeout:          time.Second * 120,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "*",
	}))

	// Routes
	setupRoutes(app, config)

	// Start server
	log.Printf("🚀 Analytics Dashboard (Go) starting on port %s", config.Port)
	log.Printf("📊 Metrics retention: %d days", config.MetricsRetention)
	log.Printf("⚡ Cache TTL: %v", config.CacheTTL)
	log.Printf("✅ High-performance Go service ready!")

	if err := app.Listen(":" + config.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func setupRoutes(app *fiber.App, config *Config) {
	// Health check
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"service":  "WaveStack Analytics Dashboard",
			"language": "Go",
			"version":  "2.0.0",
			"status":   "running",
			"performance": "10-50x faster than Python",
			"features": []string{
				"real_time_metrics",
				"high_throughput",
				"low_latency",
				"concurrent_processing",
				"efficient_memory",
			},
		})
	})

	// API routes
	api := app.Group("/api/v1/analytics")

	// Overview endpoint
	api.Get("/overview", func(c *fiber.Ctx) error {
		return getOverview(c, config)
	})

	// Trends endpoint
	api.Get("/trends/:metric", func(c *fiber.Ctx) error {
		return getTrends(c, config)
	})

	// Top content endpoint
	api.Get("/content/top", func(c *fiber.Ctx) error {
		return getTopContent(c, config)
	})

	// Track event endpoint
	api.Post("/track", func(c *fiber.Ctx) error {
		return trackEvent(c, config)
	})

	// Platform breakdown
	api.Get("/platforms", func(c *fiber.Ctx) error {
		return getPlatforms(c, config)
	})

	// Engagement metrics
	api.Get("/engagement", func(c *fiber.Ctx) error {
		return getEngagement(c, config)
	})

	// Growth metrics
	api.Get("/growth", func(c *fiber.Ctx) error {
		return getGrowth(c, config)
	})

	// Revenue metrics
	api.Get("/revenue", func(c *fiber.Ctx) error {
		return getRevenue(c, config)
	})

	// Moderation stats
	api.Get("/moderation", func(c *fiber.Ctx) error {
		return getModeration(c, config)
	})

	// Real-time metrics
	api.Get("/realtime", func(c *fiber.Ctx) error {
		return getRealtime(c, config)
	})
}
