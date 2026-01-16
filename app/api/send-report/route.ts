import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Email configuration from environment
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

interface ReportData {
  executiveSummary: string;
  findings: Array<{
    condition: string;
    confidence: string;
    evidence: string[];
    dailyLifeImpact: string;
    keralaAnalogy?: string;
  }>;
  actionPlan: {
    week1: string[];
    week2: string[];
    week3: string[];
    week4: string[];
  };
  referrals: string[];
  positiveNotes?: string[];
  parentMessage?: string;
}

// Generate HTML email content
function generateEmailHTML(
  childName: string,
  childAge: number,
  report: ReportData
): string {
  const conditionLabels: Record<string, string> = {
    'dysgraphia-motor': '✍️ Motor Dysgraphia',
    'dysgraphia-spatial': '📐 Spatial Dysgraphia',
    'dyslexia': '📖 Dyslexia',
    'dyscalculia': '🔢 Dyscalculia',
    'dyspraxia': '🎯 Dyspraxia',
    'nvld': '🧩 NVLD',
  };

  const findingsHTML = report.findings && report.findings.length > 0
    ? report.findings.map(f => `
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 10px 0; border-radius: 4px;">
        <strong>${conditionLabels[f.condition] || f.condition}</strong> 
        <span style="color: ${f.confidence === 'high' ? '#DC2626' : f.confidence === 'medium' ? '#D97706' : '#059669'};">
          (${f.confidence || 'unknown'} confidence)
        </span>
        <p style="margin: 8px 0; color: #4B5563;">${(f.evidence || []).join(', ')}</p>
        <p style="margin: 8px 0;">💡 ${f.dailyLifeImpact || ''}</p>
        ${f.keralaAnalogy ? `<p style="margin: 8px 0; background: #FDF4E7; padding: 8px; border-radius: 4px; font-style: italic;">🥥 ${f.keralaAnalogy}</p>` : ''}
      </div>
    `).join('')
    : '<div style="background: #D1FAE5; padding: 16px; border-radius: 8px; text-align: center;">🌟 Great news! No significant concerns detected. Keep up the wonderful work!</div>';

  const actionPlanHTML = report.actionPlan ? `
    <div style="display: grid; gap: 12px;">
      <div style="background: #EEF2FF; padding: 12px; border-radius: 8px;">
        <strong>📅 Week 1:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">${(report.actionPlan.week1 || []).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
      <div style="background: #F0FDF4; padding: 12px; border-radius: 8px;">
        <strong>📅 Week 2:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">${(report.actionPlan.week2 || []).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
      <div style="background: #FEF3C7; padding: 12px; border-radius: 8px;">
        <strong>📅 Week 3:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">${(report.actionPlan.week3 || []).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
      <div style="background: #FCE7F3; padding: 12px; border-radius: 8px;">
        <strong>📅 Week 4:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">${(report.actionPlan.week4 || []).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
    </div>
  ` : '<p style="color: #6B7280;">Action plan will be provided after consultation.</p>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1F2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899); padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🧠 NeuroGen Suite</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Diagnostic Report</p>
      </div>

      <!-- Child Info -->
      <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
        <h2 style="margin: 0; color: #4F46E5;">Report for ${childName}</h2>
        <p style="margin: 8px 0 0 0; color: #6B7280;">Age: ${childAge} years | Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      </div>

      <!-- Executive Summary -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">📋 Summary</h3>
        <p style="background: #F9FAFB; padding: 16px; border-radius: 8px;">${report.executiveSummary || 'Report summary not available.'}</p>
      </div>

      <!-- Findings -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">🔍 Key Findings</h3>
        ${findingsHTML}
      </div>

      <!-- Action Plan -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">📅 4-Week Action Plan</h3>
        ${actionPlanHTML}
      </div>

      <!-- Referrals -->
      ${report.referrals && report.referrals.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #4F46E5; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">👨‍⚕️ Recommended Consultations</h3>
          <ul style="background: #EEF2FF; padding: 16px 16px 16px 36px; border-radius: 8px; margin: 0;">
            ${report.referrals.map(r => `<li style="margin: 4px 0;">${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Positive Notes -->
      ${report.positiveNotes && report.positiveNotes.length > 0 ? `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #059669; border-bottom: 2px solid #D1FAE5; padding-bottom: 8px;">💪 Strengths Observed</h3>
          <ul style="background: #ECFDF5; padding: 16px 16px 16px 36px; border-radius: 8px; margin: 0;">
            ${report.positiveNotes.map(n => `<li style="margin: 4px 0;">⭐ ${n}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Parent Message -->
      ${report.parentMessage ? `
        <div style="background: #FDF4FF; border: 1px solid #E9D5FF; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; font-style: italic; color: #7C3AED;">${report.parentMessage}</p>
        </div>
      ` : ''}

      <!-- Disclaimer -->
      <div style="background: #FEF3C7; border: 1px solid #F59E0B; padding: 12px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #92400E; text-align: center;">
          ⚠️ <strong>Disclaimer:</strong> This is a screening tool, not a clinical diagnosis. 
          Please consult qualified healthcare professionals for comprehensive evaluation.
        </p>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px;">
        <p>Generated by NeuroGen Suite</p>
        <p>AI Samasya 2026 Hackathon Project</p>
        <p style="margin-top: 8px;">💜 Built with love for every child's unique learning journey</p>
      </div>

    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { email, childName, childAge, report } = await request.json();

    if (!email || !report) {
      return NextResponse.json(
        { error: 'Missing email or report data' },
        { status: 400 }
      );
    }

    // Generate HTML email
    const htmlContent = generateEmailHTML(childName || 'Child', childAge || 8, report);

    // Check if email is configured
    if (!EMAIL_USER || !EMAIL_PASS) {
      // Demo mode - return success with preview
      console.log('Email not configured - Demo mode');
      console.log('To enable email, add EMAIL_USER and EMAIL_PASS to .env.local');
      return NextResponse.json({
        success: true,
        demo: true,
        message: 'Demo mode: Email would be sent to ' + email,
        preview: htmlContent.substring(0, 500) + '...',
      });
    }

    // Create Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"NeuroGen Suite" <${EMAIL_FROM}>`,
      to: email,
      subject: `🧠 NeuroGen Suite - Diagnostic Report for ${childName || 'Your Child'}`,
      html: htmlContent,
    });

    console.log('Email sent:', info.messageId);

    return NextResponse.json({
      success: true,
      message: `Report sent successfully to ${email}`,
      messageId: info.messageId,
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: String(error) },
      { status: 500 }
    );
  }
}
