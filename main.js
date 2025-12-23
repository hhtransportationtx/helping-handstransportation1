// XWrite Pro - Main Application Logic

class XWritePro {
    constructor() {
        this.currentContent = '';
        this.writingScore = 0;
        this.engagementPrediction = 0;
        this.userPreferences = this.loadUserPreferences();
        this.contentHistory = this.loadContentHistory();
        this.analyticsData = this.generateMockAnalytics();
        this.init();
    }

    init() {
        this.initializeEventListeners();
        this.initializeAnimations();
        this.loadDashboardData();
    }

    // User Preferences Management
    loadUserPreferences() {
        const defaults = {
            writingTone: 'professional',
            contentType: 'educational',
            targetAudience: 'general',
            notifications: true,
            theme: 'light'
        };
        
        const saved = localStorage.getItem('xwrite_preferences');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }

    saveUserPreferences() {
        localStorage.setItem('xwrite_preferences', JSON.stringify(this.userPreferences));
    }

    // Content History Management
    loadContentHistory() {
        const saved = localStorage.getItem('xwrite_content_history');
        return saved ? JSON.parse(saved) : [];
    }

    saveContentHistory() {
        localStorage.setItem('xwrite_content_history', JSON.stringify(this.contentHistory));
    }

    // Real-time Writing Analysis
    analyzeWriting(content) {
        this.currentContent = content;
        
        const analysis = {
            wordCount: this.getWordCount(content),
            characterCount: content.length,
            readingTime: this.calculateReadingTime(content),
            toneScore: this.analyzeTone(content),
            engagementScore: this.predictEngagement(content),
            suggestions: this.generateSuggestions(content),
            hashtags: this.suggestHashtags(content)
        };

        this.updateWritingMetrics(analysis);
        return analysis;
    }

    getWordCount(content) {
        return content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    calculateReadingTime(content) {
        const wordsPerMinute = 200;
        const wordCount = this.getWordCount(content);
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        return minutes;
    }

    analyzeTone(content) {
        // Simulated tone analysis
        const tones = {
            professional: Math.random() * 30 + 40,
            casual: Math.random() * 25 + 35,
            witty: Math.random() * 20 + 30,
            inspirational: Math.random() * 25 + 45
        };
        
        return tones[this.userPreferences.writingTone] || tones.professional;
    }

    predictEngagement(content) {
        // Simulated engagement prediction based on content characteristics
        const factors = {
            length: content.length > 50 && content.length < 280 ? 1.2 : 0.8,
            questions: (content.match(/\?/g) || []).length * 5,
            hashtags: (content.match(/#/g) || []).length * 3,
            mentions: (content.match(/@/g) || []).length * 2,
            exclamations: (content.match(/!/g) || []).length * 2,
            numbers: (content.match(/\d/g) || []).length * 1.5
        };

        const baseScore = 50;
        const totalScore = baseScore + 
            (factors.questions + factors.hashtags + factors.mentions + 
             factors.exclamations + factors.numbers) * factors.length;

        return Math.min(100, Math.max(0, totalScore));
    }

    generateSuggestions(content) {
        const suggestions = [];
        
        if (content.length < 50) {
            suggestions.push({
                type: 'length',
                message: 'Consider adding more detail to increase engagement',
                priority: 'medium'
            });
        }

        if (content.length > 250) {
            suggestions.push({
                type: 'length',
                message: 'This might be too long for optimal engagement',
                priority: 'low'
            });
        }

        if (!(content.match(/\?/g) || []).length) {
            suggestions.push({
                type: 'engagement',
                message: 'Adding a question can boost engagement',
                priority: 'high'
            });
        }

        if ((content.match(/#/g) || []).length < 2) {
            suggestions.push({
                type: 'discoverability',
                message: 'Add 1-2 relevant hashtags to increase reach',
                priority: 'medium'
            });
        }

        return suggestions;
    }

    suggestHashtags(content) {
        const commonHashtags = {
            educational: ['#learning', '#tips', '#education', '#knowledge', '#growth'],
            business: ['#entrepreneur', '#business', '#startup', '#success', '#leadership'],
            creative: ['#creative', '#design', '#art', '#inspiration', '#creativity'],
            tech: ['#technology', '#innovation', '#coding', '#tech', '#future'],
            lifestyle: ['#lifestyle', '#motivation', '#wellness', '#mindset', '#inspiration']
        };

        const userHashtags = commonHashtags[this.userPreferences.contentType] || commonHashtags.educational;
        const contentWords = content.toLowerCase().split(/\s+/);
        
        return userHashtags.filter(tag => 
            contentWords.some(word => tag.includes(word.replace('#', '')))
        ).slice(0, 3);
    }

    updateWritingMetrics(analysis) {
        // Update UI elements with analysis results
        this.updateElement('word-count', analysis.wordCount);
        this.updateElement('character-count', analysis.characterCount);
        this.updateElement('reading-time', `${analysis.readingTime} min`);
        this.updateElement('engagement-score', `${Math.round(analysis.engagementScore)}/100`);
        
        this.updateProgressBar('tone-progress', analysis.toneScore);
        this.updateProgressBar('engagement-progress', analysis.engagementScore);
        
        this.displaySuggestions(analysis.suggestions);
        this.displayHashtags(analysis.hashtags);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateProgressBar(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = `${Math.min(100, value)}%`;
        }
    }

    displaySuggestions(suggestions) {
        const container = document.getElementById('suggestions-container');
        if (!container) return;

        container.innerHTML = '';
        suggestions.forEach(suggestion => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = `suggestion-item priority-${suggestion.priority}`;
            suggestionEl.innerHTML = `
                <div class="suggestion-icon">💡</div>
                <div class="suggestion-text">${suggestion.message}</div>
            `;
            container.appendChild(suggestionEl);
        });
    }

    displayHashtags(hashtags) {
        const container = document.getElementById('hashtags-container');
        if (!container) return;

        container.innerHTML = '';
        hashtags.forEach(hashtag => {
            const hashtagEl = document.createElement('span');
            hashtagEl.className = 'hashtag-tag';
            hashtagEl.textContent = hashtag;
            hashtagEl.onclick = () => this.insertHashtag(hashtag);
            container.appendChild(hashtagEl);
        });
    }

    insertHashtag(hashtag) {
        const textarea = document.getElementById('content-textarea');
        if (textarea) {
            const currentContent = textarea.value;
            const newContent = currentContent + ' ' + hashtag;
            textarea.value = newContent;
            this.analyzeWriting(newContent);
        }
    }

    // Content Templates
    getContentTemplates() {
        return {
            educational: {
                title: 'Educational Thread',
                template: '🧵 Thread: [Topic]\n\n1/ [Opening hook]\n\n[Key point 1]\n[Key point 2]\n[Key point 3]\n\nWhat would you add? 👇'
            },
            inspirational: {
                title: 'Inspirational Post',
                template: '💡 [Inspiring statement]\n\n[Personal story or insight]\n\n[Call to action]\n\n#motivation #mindset'
            },
            question: {
                title: 'Engagement Question',
                template: '🤔 [Thought-provoking question]\n\n[Context or personal experience]\n\nWhat\'s your experience? Share below! 👇'
            },
            tip: {
                title: 'Quick Tip',
                template: '💡 Quick tip: [Your tip]\n\n[Why it matters]\n[How to implement]\n\nTry it and let me know how it goes!'
            }
        };
    }

    applyTemplate(templateType) {
        const templates = this.getContentTemplates();
        const template = templates[templateType];
        
        if (template) {
            const textarea = document.getElementById('content-textarea');
            if (textarea) {
                textarea.value = template.template;
                this.analyzeWriting(template.template);
            }
        }
    }

    // Analytics Dashboard
    generateMockAnalytics() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const analytics = {
            overview: {
                totalPosts: 156,
                totalEngagement: 12480,
                avgEngagementRate: 8.2,
                followerGrowth: 342,
                topPerformingPost: {
                    content: 'Just launched my new course! 🚀 Excited to help creators improve their writing skills. What\'s your biggest content challenge?',
                    engagement: 1247,
                    date: '2024-12-15'
                }
            },
            engagementTrend: this.generateEngagementTrend(thirtyDaysAgo, now),
            contentTypes: [
                { type: 'Educational', count: 45, engagement: 4520 },
                { type: 'Inspirational', count: 38, engagement: 3890 },
                { type: 'Questions', count: 32, engagement: 2840 },
                { type: 'Tips', count: 41, engagement: 1230 }
            ],
            bestPostingTimes: [
                { time: '9:00 AM', engagement: 2450 },
                { time: '2:00 PM', engagement: 1890 },
                { time: '7:00 PM', engagement: 3240 },
                { time: '11:00 PM', engagement: 1560 }
            ]
        };

        return analytics;
    }

    generateEngagementTrend(startDate, endDate) {
        const trend = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            trend.push({
                date: currentDate.toISOString().split('T')[0],
                engagement: Math.floor(Math.random() * 500) + 200,
                posts: Math.floor(Math.random() * 8) + 2
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return trend;
    }

    loadDashboardData() {
        if (typeof echarts !== 'undefined') {
            this.initializeCharts();
        }
    }

    initializeCharts() {
        this.createEngagementChart();
        this.createContentTypeChart();
        this.createPostingTimeChart();
    }

    createEngagementChart() {
        const chartElement = document.getElementById('engagement-chart');
        if (!chartElement) return;

        const chart = echarts.init(chartElement);
        const trendData = this.analyticsData.engagementTrend;

        const option = {
            title: {
                text: 'Engagement Trend',
                textStyle: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                textStyle: { color: '#1a1a1a' }
            },
            xAxis: {
                type: 'category',
                data: trendData.map(d => d.date),
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#7a8a99' }
            },
            yAxis: {
                type: 'value',
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#7a8a99' },
                splitLine: { lineStyle: { color: '#f8f9fa' } }
            },
            series: [{
                data: trendData.map(d => d.engagement),
                type: 'line',
                smooth: true,
                lineStyle: { color: '#6b7d6a', width: 3 },
                itemStyle: { color: '#6b7d6a' },
                areaStyle: { 
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(107, 125, 106, 0.3)' },
                            { offset: 1, color: 'rgba(107, 125, 106, 0.05)' }
                        ]
                    }
                }
            }]
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
    }

    createContentTypeChart() {
        const chartElement = document.getElementById('content-type-chart');
        if (!chartElement) return;

        const chart = echarts.init(chartElement);
        const contentData = this.analyticsData.contentTypes;

        const option = {
            title: {
                text: 'Content Type Performance',
                textStyle: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                textStyle: { color: '#1a1a1a' }
            },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                data: contentData.map(item => ({
                    value: item.engagement,
                    name: item.type
                })),
                itemStyle: {
                    color: function(params) {
                        const colors = ['#6b7d6a', '#c4896b', '#7a8a99', '#e5e7eb'];
                        return colors[params.dataIndex % colors.length];
                    }
                },
                label: {
                    color: '#1a1a1a',
                    fontSize: 14
                }
            }]
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
    }

    createPostingTimeChart() {
        const chartElement = document.getElementById('posting-time-chart');
        if (!chartElement) return;

        const chart = echarts.init(chartElement);
        const timeData = this.analyticsData.bestPostingTimes;

        const option = {
            title: {
                text: 'Best Posting Times',
                textStyle: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                textStyle: { color: '#1a1a1a' }
            },
            xAxis: {
                type: 'category',
                data: timeData.map(d => d.time),
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#7a8a99' }
            },
            yAxis: {
                type: 'value',
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#7a8a99' },
                splitLine: { lineStyle: { color: '#f8f9fa' } }
            },
            series: [{
                data: timeData.map(d => d.engagement),
                type: 'bar',
                itemStyle: { 
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: '#c4896b' },
                            { offset: 1, color: 'rgba(196, 137, 107, 0.7)' }
                        ]
                    }
                },
                barWidth: '60%'
            }]
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
    }

    // Event Listeners
    initializeEventListeners() {
        // Writing textarea listener
        const textarea = document.getElementById('content-textarea');
        if (textarea) {
            textarea.addEventListener('input', (e) => {
                this.analyzeWriting(e.target.value);
            });
        }

        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateType = e.target.dataset.template;
                this.applyTemplate(templateType);
            });
        });

        // Tone selector
        const toneSelector = document.getElementById('tone-selector');
        if (toneSelector) {
            toneSelector.addEventListener('change', (e) => {
                this.userPreferences.writingTone = e.target.value;
                this.saveUserPreferences();
                if (this.currentContent) {
                    this.analyzeWriting(this.currentContent);
                }
            });
        }

        // Save content button
        const saveBtn = document.getElementById('save-content-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCurrentContent();
            });
        }
    }

    saveCurrentContent() {
        if (!this.currentContent.trim()) return;

        const contentItem = {
            id: Date.now(),
            content: this.currentContent,
            timestamp: new Date().toISOString(),
            engagementScore: this.engagementPrediction,
            wordCount: this.getWordCount(this.currentContent)
        };

        this.contentHistory.unshift(contentItem);
        this.saveContentHistory();

        this.showNotification('Content saved successfully!', 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Animation Initialization
    initializeAnimations() {
        if (typeof anime !== 'undefined') {
            this.animatePageElements();
        }
    }

    animatePageElements() {
        // Animate dashboard cards
        anime({
            targets: '.dashboard-card',
            translateY: [50, 0],
            opacity: [0, 1],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutQuart'
        });

        // Animate hero elements
        anime({
            targets: '.hero-content > *',
            translateY: [30, 0],
            opacity: [0, 1],
            delay: anime.stagger(150),
            duration: 1000,
            easing: 'easeOutQuart'
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.xwritePro = new XWritePro();
});

// Utility functions for navigation
function navigateToPage(page) {
    window.location.href = page;
}

// Content template data
const contentTemplates = {
    educational: {
        title: 'Educational Thread',
        template: '🧵 Thread: [Topic]\n\n1/ [Opening hook]\n\n[Key point 1]\n[Key point 2]\n[Key point 3]\n\nWhat would you add? 👇'
    },
    inspirational: {
        title: 'Inspirational Post',
        template: '💡 [Inspiring statement]\n\n[Personal story or insight]\n\n[Call to action]\n\n#motivation #mindset'
    },
    question: {
        title: 'Engagement Question',
        template: '🤔 [Thought-provoking question]\n\n[Context or personal experience]\n\nWhat\'s your experience? Share below! 👇'
    },
    tip: {
        title: 'Quick Tip',
        template: '💡 Quick tip: [Your tip]\n\n[Why it matters]\n[How to implement]\n\nTry it and let me know how it goes!'
    }
};