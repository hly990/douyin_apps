const routes = {
    recommend: '/pages/recommend/recommend',
    profile: '/pages/profile/profile',
    videoDetail: '/pages/videoDetail/videoDetail'
};

function navigateToPage(pageName, params = {}) {
    if (!routes[pageName]) {
        console.error('未知的页面名称:', pageName);
        return;
    }

    const url = routes[pageName];
    const queryString = Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');

    const finalUrl = queryString ? `${url}?${queryString}` : url;

    if (pageName === 'recommend' || pageName === 'profile') {
        tt.switchTab({
            url: finalUrl,
            fail: (err) => {
                console.error('导航失败，尝试使用navigateTo', err);
                tt.navigateTo({ url: finalUrl });
            }
        });
    } else {
        tt.navigateTo({
            url: finalUrl,
            fail: (err) => {
                console.error('导航失败:', err);
            }
        });
    }
}

module.exports = {
    navigateToPage
};