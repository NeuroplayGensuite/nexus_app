/**
 * Pre-generated Sample Datasets
 * Hand-crafted representative samples for hybrid AI testing
 * Based on clinical research norms
 */

const fs = require('fs');
const path = require('path');

// Statistical generator using Box-Muller transform for Gaussian distributions
function randn(mean, stdDev) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const keralaNames = [
    'Ananya', 'Arjun', 'Priya', 'Aditi', 'Krishna', 'Lakshmi', 'Rohan', 'Meera',
    'Kiran', 'Divya', 'Aarav', 'Ishaan', 'Diya', 'Riya', 'Aditya', 'Kavya',
    'Nisha', 'Rahul', 'Sneha', 'Vikram', 'Pooja', 'Sanjay', 'Anjali', 'Raj',
    'Pradeep', 'Swati', 'Deepak', 'Rekha', 'Arun', 'Sita', 'Mohan', 'Geetha'
];

function generateDyslexiaDataset(n = 500) {
    const samples = [];
    const atRiskCount = Math.floor(n * 0.15);

    for (let i = 0; i < n; i++) {
        const isAtRisk = i < atRiskCount;
        const age = randomInt(60, 96);

        samples.push({
            id: `dys_${String(i + 1).padStart(3, '0')}`,
            name: keralaNames[i % keralaNames.length],
            age_months: age,
            phonemic_latency_ms: Math.round(isAtRisk ? randn(1900, 400) : randn(1000, 200)),
            visual_auditory_error_rate: Math.round(isAtRisk ? randn(35, 8) : randn(10, 3)),
            rhyme_detection_accuracy: Math.round(isAtRisk ? randn(52, 10) : randn(82, 7)),
            phonemic_slips: isAtRisk ? randomInt(4, 8) : randomInt(0, 2),
            label: isAtRisk ? 'at_risk_dyslexia' : 'typical'
        });
    }

    return samples.sort(() => Math.random() - 0.5); // Shuffle
}

function generateDysgraphiaDataset(n = 500) {
    const samples = [];
    const atRiskCount = Math.floor(n * 0.12);

    for (let i = 0; i < n; i++) {
        const isAtRisk = i < atRiskCount;

        samples.push({
            id: `dysg_${String(i + 1).padStart(3, '0')}`,
            name: keralaNames[i % keralaNames.length],
            age_months: randomInt(60, 96),
            mse: Math.round(isAtRisk ? randn(60, 15) : randn(16, 6)),
            jerk_metric: Math.round(isAtRisk ? randn(800, 200) : randn(200, 80)),
            pressure_variance: Number((isAtRisk ? randn(0.7, 0.15) : randn(0.2, 0.08)).toFixed(2)),
            corner_cutting_incidents: isAtRisk ? randomInt(5, 12) : randomInt(0, 2),
            wall_hugging_percentage: Math.round(isAtRisk ? randn(65, 12) : randn(20, 8)),
            tremor_indicator: Number((isAtRisk ? randn(0.45, 0.12) : randn(0.10, 0.04)).toFixed(2)),
            label: isAtRisk ? 'at_risk_dysgraphia' : 'typical'
        });
    }

    return samples.sort(() => Math.random() - 0.5);
}

function generateDyscalculiaDataset(n = 500) {
    const samples = [];
    const atRiskCount = Math.floor(n * 0.14);

    for (let i = 0; i < n; i++) {
        const isAtRisk = i < atRiskCount;
        const age = randomInt(60, 96);

        samples.push({
            id: `dysc_${String(i + 1).padStart(3, '0')}`,
            name: keralaNames[i % keralaNames.length],
            age_months: age,
            subitizing_speed_ms: Math.round(isAtRisk ? randn(1800, 500) : randn(550, 120)),
            subitizing_threshold: isAtRisk ? randomInt(2, 3) : randomInt(4, 5),
            counting_accuracy: Math.round(isAtRisk ? randn(57, 12) : randn(91, 5)),
            symbolic_mapping_delay: Math.round(isAtRisk ? randn(2100, 600) : randn(700, 150)),
            magnitude_comparison_error: Math.round(isAtRisk ? randn(35, 8) : randn(8, 3)),
            label: isAtRisk ? 'at_risk_dyscalculia' : 'typical'
        });
    }

    return samples.sort(() => Math.random() - 0.5);
}

function generateDyspraxiaDataset(n = 500) {
    const samples = [];
    const atRiskCount = Math.floor(n * 0.10);

    for (let i = 0; i < n; i++) {
        const isAtRisk = i < atRiskCount;

        samples.push({
            id: `dysp_${String(i + 1).padStart(3, '0')}`,
            name: keralaNames[i % keralaNames.length],
            age_months: randomInt(60, 96),
            rhythm_accuracy: Math.round(isAtRisk ? randn(47, 10) : randn(83, 7)),
            motor_lag_ms: Math.round(isAtRisk ? randn(850, 250) : randn(175, 60)),
            sequence_memory_span: isAtRisk ? randomInt(2, 3) : randomInt(4, 6),
            missed_beats: isAtRisk ? randomInt(5, 10) : randomInt(0, 2),
            coordination_score: Number((isAtRisk ? randn(0.42, 0.12) : randn(0.82, 0.10)).toFixed(2)),
            label: isAtRisk ? 'at_risk_dyspraxia' : 'typical'
        });
    }

    return samples.sort(() => Math.random() - 0.5);
}

function generateNVLDDataset(n = 500) {
    const samples = [];
    const atRiskCount = Math.floor(n * 0.08);

    for (let i = 0; i < n; i++) {
        const isAtRisk = i < atRiskCount;

        samples.push({
            id: `nvld_${String(i + 1).padStart(3, '0')}`,
            name: keralaNames[i % keralaNames.length],
            age_months: randomInt(60, 96),
            spatial_decay_1s: Number((isAtRisk ? randn(0.65, 0.12) : randn(0.18, 0.06)).toFixed(2)),
            spatial_decay_3s: Number((isAtRisk ? randn(0.75, 0.10) : randn(0.30, 0.08)).toFixed(2)),
            spatial_decay_5s: Number((isAtRisk ? randn(0.82, 0.08) : randn(0.40, 0.10)).toFixed(2)),
            visual_memory_score: Number((isAtRisk ? randn(0.45, 0.12) : randn(0.82, 0.10)).toFixed(2)),
            pattern_recognition_accuracy: Math.round(isAtRisk ? randn(52, 10) : randn(82, 7)),
            label: isAtRisk ? 'at_risk_nvld' : 'typical'
        });
    }

    return samples.sort(() => Math.random() - 0.5);
}

function main() {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  🧬 GENERATING SYNTHETIC DATASETS');
    console.log('  (Statistical simulation - Gaussian distributions)');
    console.log('══════════════════════════════════════════════════\n');

    const datasets = {
        dyslexia: generateDyslexiaDataset(500),
        dysgraphia: generateDysgraphiaDataset(500),
        dyscalculia: generateDyscalculiaDataset(500),
        dyspraxia: generateDyspraxiaDataset(500),
        nvld: generateNVLDDataset(500)
    };

    const dataDir = path.join(__dirname, '..', 'data', 'synthetic');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    let totalSamples = 0;
    let totalAtRisk = 0;

    for (const [disorder, data] of Object.entries(datasets)) {
        const atRisk = data.filter(s => s.label.includes('at_risk')).length;
        const typical = data.length - atRisk;

        console.log(`✅ ${disorder.padEnd(15)} ${data.length} samples (${atRisk} at-risk, ${typical} typical)`);

        const filename = path.join(dataDir, `${disorder}_dataset.json`);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`   📁 ${filename}\n`);

        totalSamples += data.length;
        totalAtRisk += atRisk;
    }

    const combinedFile = path.join(dataDir, 'combined_dataset.json');
    fs.writeFileSync(combinedFile, JSON.stringify(datasets, null, 2));

    console.log('══════════════════════════════════════════════════');
    console.log('✅ ALL DATASETS GENERATED SUCCESSFULLY');
    console.log('══════════════════════════════════════════════════');
    console.log(`\n📊 Total samples: ${totalSamples}`);
    console.log(`⚠️  At-risk samples: ${totalAtRisk} (${((totalAtRisk / totalSamples) * 100).toFixed(1)}%)`);
    console.log(`✅ Typical samples: ${totalSamples - totalAtRisk} (${(((totalSamples - totalAtRisk) / totalSamples) * 100).toFixed(1)}%)`);
    console.log(`📁 Location: ${dataDir}\n`);
    console.log('🎯 Datasets ready for ML training and validation!\n');
}

if (require.main === module) {
    main();
}

module.exports = {
    generateDyslexiaDataset,
    generateDysgraphiaDataset,
    generateDyscalculiaDataset,
    generateDyspraxiaDataset,
    generateNVLDDataset
};
