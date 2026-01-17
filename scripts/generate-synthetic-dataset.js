/**
 * Synthetic Clinical Dataset Generator using Groq API
 * Generates realistic neuro-diagnostic training data in small batches
 */

const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Simple prompt for reliable JSON generation
function getPrompt(disorder, batchSize) {
    const templates = {
        dyslexia: `Create ${batchSize} test records. Each must have: id, name (Kerala), age_months (60-96), phonemic_latency_ms (800-1200 normal or 1500-2500 at-risk), visual_auditory_error_rate (5-15 normal or 25-45 at-risk), rhyme_detection_accuracy (75-90 normal or 40-65 at-risk), phonemic_slips (0-2 normal or 4-8 at-risk), label ("typical" or "at_risk_dyslexia"). Make 15% at-risk. Return ONLY JSON array.`,

        dysgraphia: `Create ${batchSize} test records. Each: id, name, age_months, mse (8-25 or 40-80), jerk_metric (100-300 or 500-1200), pressure_variance (0.1-0.3 or 0.5-0.9), corner_cutting_incidents, wall_hugging_percentage, tremor_indicator, label. 12% at-risk. JSON array only.`,

        dyscalculia: `Create ${batchSize} test records. Each: id, name, age_months, subitizing_speed_ms (400-700 or 1200-2500), subitizing_threshold (4-5 or 2-3), counting_accuracy (85-98 or 45-70), symbolic_mapping_delay, magnitude_comparison_error, label. 14% at-risk. JSON array only.`,

        dyspraxia: `Create ${batchSize} test records. Each: id, name, age_months, rhythm_accuracy (75-92 or 35-60), motor_lag_ms (100-250 or 500-1200), sequence_memory_span (4-6 or 2-3), missed_beats, coordination_score, label. 10% at-risk. JSON array only.`,

        nvld: `Create ${batchSize} test records. Each: id, name, age_months, spatial_decay_1s (0.1-0.25 or 0.5-0.8), spatial_decay_3s, spatial_decay_5s, visual_memory_score, pattern_recognition_accuracy, label. 8% at-risk. JSON array only.`
    };

    return templates[disorder];
}

async function generateBatch(disorder, size) {
    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'Output only JSON arrays. No text, no markdown.' },
                { role: 'user', content: getPrompt(disorder, size) }
            ],
            temperature: 0.9,
            max_tokens: 3000,
        }),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.choices[0].message.content.trim();

    // Extract JSON array
    text = text.replace(/```json/g, '').replace(/```/g, '');
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');

    if (start === -1 || end === -1) {
        throw new Error('No array found');
    }

    return JSON.parse(text.substring(start, end + 1));
}

async function generateDataset(disorder, total) {
    console.log(`\n🧠 ${disorder}: Generating ${total} samples...`);
    const batchSize = 50;
    const batches = total / batchSize;
    const all = [];

    for (let i = 0; i < batches; i++) {
        try {
            const batch = await generateBatch(disorder, batchSize);
            all.push(...batch);
            process.stdout.write(`   ${all.length}/${total}\r`);
            await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
            console.error(`\n   ⚠️  Batch ${i + 1} failed: ${err.message}`);
        }
    }

    console.log(`\n✅ ${all.length} samples (${all.filter(s => s.label?.includes('at_risk')).length} at-risk)`);
    return all;
}

async function main() {
    console.log('\n═════════════════════════════════════════');
    console.log('  🧬 SYNTHETIC DATASET GENERATION');
    console.log('═════════════════════════════════════════');

    const disorders = ['dyslexia', 'dysgraphia', 'dyscalculia', 'dyspraxia', 'nvld'];
    const datasets = {};

    for (const disorder of disorders) {
        datasets[disorder] = await generateDataset(disorder, 500);

        const dir = path.join(__dirname, '..', 'data', 'synthetic');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const file = path.join(dir, `${disorder}_dataset.json`);
        fs.writeFileSync(file, JSON.stringify(datasets[disorder], null, 2));
        console.log(`📁 Saved: ${file}\n`);
    }

    const combined = path.join(__dirname, '..', 'data', 'synthetic', 'combined_dataset.json');
    fs.writeFileSync(combined, JSON.stringify(datasets, null, 2));

    const total = Object.values(datasets).reduce((sum, d) => sum + d.length, 0);
    console.log('\n═════════════════════════════════════════');
    console.log('✅ COMPLETE');
    console.log(`📊 Total samples: ${total}`);
    console.log('═════════════════════════════════════════\n');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { generateDataset };
