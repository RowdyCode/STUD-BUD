const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const RECORDS_DIR = path.join(__dirname, 'records');
if (!fs.existsSync(RECORDS_DIR)) fs.mkdirSync(RECORDS_DIR);

// Helper for time validation
async function getValidatedTime() {
    try {
        const response = await axios.get('https://timeapi.io/api/v1/time/current/zone?timezone=Asia/Calcutta', { timeout: 2000 });
        return { time: response.data.dateTime, source: 'API-Verified' };
    } catch (e) {
        return { time: new Date().toISOString(), source: 'Local-Time' };
    }
}

// POST: Log a study session
app.post('/api/log-session', async (req, res) => {
    const { subject, duration } = req.body;
    let now;
    let source = 'Local-Time';

    try {
        const response = await axios.get('https://timeapi.io/api/v1/time/current/zone?timezone=Asia/Calcutta', { timeout: 2000 });
        now = new Date(response.data.dateTime);
        source = 'API-Verified';
    } catch (e) {
        now = new Date();
    }

    // Safety check for invalid dates
    if (isNaN(now.getTime())) now = new Date();

    const fileName = `Prep_Log_${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}.csv`;
    const filePath = path.join(RECORDS_DIR, fileName);
    
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const dateStr = `${day}/${month}/${year}`; 

    const row = `${now.toISOString()},${dateStr},${subject},${duration},${source}\n`;
    
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "Timestamp,Date,Subject,Duration_Min,Time_Source\n");
    }
    
    fs.appendFileSync(filePath, row);
    res.json({ success: true });
});

app.get('/api/analytics', (req, res) => {
    const { subject, month, year, date } = req.query; 
    const fileName = `Prep_Log_${month.padStart(2, '0')}_${year}.csv`;
    const filePath = path.join(RECORDS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
        return res.json({ noFile: true, totalTime: 0, monthlyAvg: 0, dailySum: 0 });
    }

    const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim() !== "" && !l.startsWith('Timestamp'));
    
    let totalMinutes = 0;
    let dailySum = 0;
    const daysInMonth = new Date(year, month, 0).getDate();

    lines.forEach(line => {
        const columns = line.split(',');
        if (columns.length < 4) return;

        const logDate = columns[1].trim(); 
        const logSub = columns[2].trim();  
        const dur = parseFloat(columns[3]) || 0;

        // Determine if this row matches the subject filter
        // "All" means the filter is always true. 
        // Otherwise, the subject must match exactly (ignoring case).
        const isAll = !subject || subject === "All";
        const subMatch = isAll || logSub.toLowerCase() === subject.toLowerCase();

        // --- 1. Monthly Logic ---
        if (subMatch) {
            totalMinutes += dur;
        }

        // --- 2. Daily Logic ---
        if (date && logDate === date) {
            if (subMatch) {
                dailySum += dur;
            }
        }
    });

    res.json({ 
        totalTime: totalMinutes.toFixed(2), 
        monthlyAvg: (totalMinutes / daysInMonth).toFixed(2), 
        dailySum: dailySum.toFixed(2) 
    });
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));