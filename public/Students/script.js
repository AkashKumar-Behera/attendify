document.addEventListener("DOMContentLoaded", () => {
    
    // Elements - Navigation
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('page-title');

    // Elements - Config
    const configSec = document.getElementById('config-sec');
    const configRoll = document.getElementById('config-roll');
    const loadDataBtn = document.getElementById('load-data-btn');

    // Elements - Sidebar
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarRoll = document.getElementById('sidebar-roll');

    // Elements - Dashboard Stats
    const dashTotal = document.getElementById('dash-total');
    const dashPresent = document.getElementById('dash-present');
    const dashAbsent = document.getElementById('dash-absent');

    // Elements - Profile Card
    const mainAvatar = document.getElementById('main-avatar');
    const mainName = document.getElementById('main-name');
    const mainRollMsg = document.getElementById('main-roll');
    const attendanceBadge = document.getElementById('attendance-badge');
    const healthText = document.getElementById('health-text');
    const healthBar = document.getElementById('health-bar');

    // Elements - Analytics Chart
    const circleChartPath = document.getElementById('circle-chart-path');
    const chartPercentage = document.getElementById('chart-percentage');

    // Elements - Leaderboard
    const leaderboardSecBadge = document.getElementById('leaderboard-sec-badge');
    const leaderboardBody = document.getElementById('leaderboard-body');

    // Navigation Logic
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show corresponding section
            const targetId = btn.getAttribute('data-target');
            viewSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Update title
            pageTitle.innerText = targetId === 'dashboard' ? 'Dashboard Overview' : 'Section Leaderboard';
        });
    });

    // Helper functions for UI
    const getInitials = (name) => {
        if (!name) return "?";
        return name.substring(0, 1).toUpperCase();
    };

    const updateChart = (percentage) => {
        // stroke-dasharray format is "amount_filled, amount_empty" over circle length 100.
        // Wait for next tick so animation plays if it changed from 0
        setTimeout(() => {
            const filled = isNaN(percentage) ? 0 : percentage;
            circleChartPath.setAttribute('stroke-dasharray', `${filled}, 100`);
            
            // Color logic based on percentage
            if(filled >= 75) {
                circleChartPath.style.stroke = "var(--accent-green)";
            } else if(filled >= 50) {
                circleChartPath.style.stroke = "orange";
            } else {
                circleChartPath.style.stroke = "var(--accent-red)";
            }
        }, 100);
    };

    // Load Data Click Handler
    loadDataBtn.addEventListener('click', async () => {
        const sec = configSec.value;
        const roll = configRoll.value.trim();

        if(!roll) {
            alert("Please enter a Roll No");
            return;
        }

        // Add loading state
        const originalText = loadDataBtn.innerText;
        loadDataBtn.innerText = "Loading...";
        loadDataBtn.disabled = true;

        try {
            // Fetch Profile/Dashboard Data
            const studRes = await fetch(`/api/student/${sec}/${roll}`);
            if(!studRes.ok) throw new Error("Failed to fetch student data");
            const studData = await studRes.json();

            // Fetch Leaderboard Data
            const leadRes = await fetch(`/api/leaderboard/${sec}`);
            if(!leadRes.ok) throw new Error("Failed to fetch leaderboard data");
            const leadData = await leadRes.json();

            // --- Update UI for Dashboard ---
            
            // Sidebar
            const initials = getInitials(studData.name);
            sidebarAvatar.innerText = initials;
            sidebarName.innerText = studData.name;
            sidebarRoll.innerText = `Section ${sec} | Roll ${studData.roll}`;

            // Top Stats
            dashTotal.innerText = studData.totalSessions;
            dashPresent.innerText = studData.presentCount;
            dashAbsent.innerText = studData.absentCount;

            // Profile Card
            mainAvatar.innerText = initials;
            mainName.innerText = studData.name;
            mainRollMsg.innerText = `Section ${sec} | Roll ${studData.roll}`;
            attendanceBadge.innerText = `${studData.percentage}%`;

            healthBar.style.width = `${studData.percentage}%`;
            
            if(studData.percentage >= 75) {
                healthText.innerText = 'Good';
                healthText.style.color = 'var(--accent-green)';
                healthBar.style.background = 'linear-gradient(90deg, #00e676, #00b0ff)';
            } else if(studData.percentage >= 50) {
                healthText.innerText = 'Average';
                healthText.style.color = 'orange';
                healthBar.style.background = 'linear-gradient(90deg, orange, #ffc400)';
            } else {
                healthText.innerText = 'Critical';
                healthText.style.color = 'var(--accent-red)';
                healthBar.style.background = 'linear-gradient(90deg, #ff3d00, #d50000)';
            }

            // Analytics Visual
            chartPercentage.innerText = `${studData.percentage}%`;
            updateChart(studData.percentage);


            // --- Update UI for Leaderboard ---
            leaderboardSecBadge.innerText = `Section ${sec}`;
            leaderboardBody.innerHTML = '';
            
            if(leadData.length === 0) {
                leaderboardBody.innerHTML = '<tr><td colspan="5" class="loading-state">No attendance data found for this section</td></tr>';
            } else {
                leadData.forEach((student, index) => {
                    const rank = index + 1;
                    let rankClass = '';
                    if(rank === 1) rankClass = 'rank-1';
                    else if(rank === 2) rankClass = 'rank-2';
                    else if(rank === 3) rankClass = 'rank-3';

                    const rowColor = (student.roll === roll) ? 'style="background: rgba(0, 229, 255, 0.1); border-left: 2px solid var(--accent-cyan);"' : '';

                    const html = `
                        <tr ${rowColor}>
                            <td class="${rankClass}">#${rank}</td>
                            <td>${student.name}</td>
                            <td>${student.roll}</td>
                            <td>${student.present} / ${student.total}</td>
                            <td style="color: ${student.percentage >= 75 ? 'var(--accent-green)' : (student.percentage < 50 ? 'var(--accent-red)' : 'white')}">
                                ${student.percentage}%
                            </td>
                        </tr>
                    `;
                    leaderboardBody.insertAdjacentHTML('beforeend', html);
                });
            }

        } catch (error) {
            console.error(error);
            alert("Error loading data. Check console for details and ensure server is running.");
        } finally {
            loadDataBtn.innerText = originalText;
            loadDataBtn.disabled = false;
        }
    });
});
