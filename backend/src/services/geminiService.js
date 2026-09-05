const { getGeminiClient } = require('../config/gemini');

/**
 * Generates personalized strategic advice for a generated study plan.
 * Cost-effective: Uses gemini-1.5-flash, strictly capped token count, and robust fallback templates.
 */
const generatePlanAdvice = async ({ totalSessions, totalHours, subjectSummaries, preferences }) => {
  const fallbackAdvice = {
    summary: `Structured ${totalHours} hours across ${totalSessions} sessions aligned with your exam dates and peak energy hours.`,
    strategicTip: `Tackle your highest-difficulty chapters early in your ${preferences?.preferredPeriod?.toLowerCase() || 'morning'} sessions. Follow the 50/10 Pomodoro cadence to avoid cognitive fatigue before exams.`,
  };

  const client = getGeminiClient();
  if (!client) {
    console.log('[Gemini Service]: API key not configured. Using rule-based fallback advice.');
    return fallbackAdvice;
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    });

    const prompt = `You are an expert academic study strategist.
A student has a generated study timetable with these metrics:
- Total Scheduled Hours: ${totalHours} hrs over ${totalSessions} sessions
- Preferred Study Period: ${preferences?.preferredPeriod || 'Morning'}
- Subjects Breakdown: ${JSON.stringify(subjectSummaries)}

Provide a concise, encouraging study plan summary and one specific high-impact strategic tip.
Return ONLY valid raw JSON without markdown code blocks, using this exact format:
{"summary": "2 sentences summarizing the study roadmap", "strategicTip": "1 actionable technique recommendation (e.g., active recall, Feynman technique)"}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean any accidental markdown quotes
    const cleanedText = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanedText);

    return {
      summary: parsed.summary || fallbackAdvice.summary,
      strategicTip: parsed.strategicTip || fallbackAdvice.strategicTip,
    };
  } catch (error) {
    console.warn(`[Gemini Service Warning]: ${error.message}. Returning fallback advice.`);
    return fallbackAdvice;
  }
};

/**
 * Generates a brief study technique advice for an individual topic on demand
 */
const getTopicStudyTip = async (topicTitle, difficulty) => {
  const fallbackTip = `Use active recall: Read a sub-section of "${topicTitle}", close your notes, and write down the key concepts from memory.`;
  const client = getGeminiClient();
  if (!client) return fallbackTip;

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 80, temperature: 0.6 },
    });

    const prompt = `Give a 1-sentence actionable study tip for mastering the topic: "${topicTitle}" (Difficulty: ${difficulty}/5). Focus on memory retention or problem solving. No greetings.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim() || fallbackTip;
  } catch (error) {
    return fallbackTip;
  }
};

/**
 * Deterministic regex-based syllabus extraction fallback
 * Deterministic regex-based syllabus extraction fallback
 * Used when Gemini API is unconfigured, rate-limited, or unavailable.
 */
const fallbackExtractSyllabus = (text, subjectName = 'Course') => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const units = [];
  let currentUnit = null;
  let nextIsTopic = false;

  const unitRegex = /^(?:unit|module|chapter|section|part|week|lecture|lesson|block|theme)\s*(\d+|[ivxlcdm]+)?[\s:\-—\.]*(.*)/i;
  const sectionHeaderRegex = /^(?:topics|important\s*\/\s*exam\s*focus|curriculum|syllabus|course\s*outline|contents|course\s*content)[\s:\-—\.]*$/i;

  // Supports Unicode bullets, hyphens, en/em dashes, and arrows
  const bulletRegex = /^[\u2022\u2023\u2043\u2219\u25cb\u25cf\u25aa\u25ab\u25b8\u25ba\uf0a7\uf0b7\uf0d8•*—–>~o\-]\s*(.+)/;
  const numberRegex = /^(\(?\d+(?:\.\d+)*\)?|[a-gA-G]\)|\(?[a-gA-G]\.|\(?[ivxlcdmIVXLCDM]+\)?)\s*[\.\-—\)]?\s+(.+)/;

  const ensureUnit = (name) => {
    if (!currentUnit) {
      const cleanName = name || `${subjectName} Core Topics`;
      currentUnit = { unitName: cleanName, title: cleanName, topics: [] };
      units.push(currentUnit);
    }
    return currentUnit;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip pagination, single digit lines, or generic syllabus title lines
    if (/^page\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(line) || /^\d+$/.test(line)) continue;
    if (/^(course\s*(syllabus|outline)|sample\s*(syllabus|notes)|syllabus)$/i.test(line)) continue;

    // Single-character bullet indicator on its own line
    if (['•', '-', '*', '—', '–', '\u2022'].includes(line)) {
      nextIsTopic = true;
      continue;
    }

    if (unitRegex.test(line) || sectionHeaderRegex.test(line)) {
      const cleanUnitName = line.replace(/[:\-—\.\s]+$/, '').trim();
      currentUnit = { unitName: cleanUnitName, title: cleanUnitName, topics: [] };
      units.push(currentUnit);
      nextIsTopic = false;
      continue;
    }

    let topicCandidate = '';
    if (nextIsTopic) {
      topicCandidate = line;
      nextIsTopic = false;
    } else if (bulletRegex.test(line)) {
      topicCandidate = line.replace(bulletRegex, '$1').trim();
    } else if (numberRegex.test(line)) {
      topicCandidate = line.replace(numberRegex, '$2').trim();
    } else if (currentUnit && line.length >= 4 && line.length <= 120 && !line.toLowerCase().includes('sample syllabus') && !line.toLowerCase().includes('sample notes')) {
      // Lines under a unit without explicit bullets
      topicCandidate = line;
    } else if (!currentUnit && line.length >= 4 && line.length <= 100 && !/syllabus/i.test(line)) {
      // Plain lines before any unit header
      topicCandidate = line;
    }

    if (
      topicCandidate &&
      topicCandidate.length >= 2 &&
      !topicCandidate.toLowerCase().includes('sample syllabus') &&
      !topicCandidate.toLowerCase().includes('sample notes')
    ) {
      ensureUnit();

      // Check if candidate contains semicolon-separated items
      if (topicCandidate.includes(';')) {
        const subParts = topicCandidate.split(';').map((p) => p.trim()).filter((p) => p.length >= 2);
        if (subParts.length > 1 && subParts.length <= 5) {
          for (const sp of subParts) {
            currentUnit.topics.push({
              title: sp.slice(0, 100).trim(),
              estimatedHours: 2,
              difficulty: 3,
            });
          }
          continue;
        }
      }

      currentUnit.topics.push({
        title: topicCandidate.slice(0, 100).trim(),
        estimatedHours: 2,
        difficulty: 3,
      });
    }
  }

  // Ensure dual naming compatibility (unitName and title) on all units
  units.forEach((u) => {
    if (!u.title) u.title = u.unitName;
    if (!u.unitName) u.unitName = u.title;
  });

  const validUnits = units.filter((u) => u.topics && u.topics.length > 0);
  if (validUnits.length === 0) {
    throw new Error(
      'Could not identify structured chapters or topics from the syllabus text. Please check the PDF content or add topics manually.'
    );
  }

  return validUnits;
};

/**
 * Extracts structured units and topics from syllabus text using Gemini 1.5 Flash.
 * Falls back to deterministic pattern-matching if Gemini is unavailable or quota is exceeded.
 *
 * @param {string} syllabusText - Plain text extracted from syllabus PDF
 * @param {string} subjectName - Subject title for context
 * @returns {Promise<{ units: Array<{ unitName: string, title: string, topics: Array<{ title: string, estimatedHours: number, difficulty: number }> }>, source: string }>}
 */
const extractSyllabusTopics = async (syllabusText, subjectName = 'Course') => {
  const client = getGeminiClient();

  if (!client) {
    console.log('[Gemini Service]: API key not configured. Using deterministic syllabus fallback parser.');
    const fallbackUnits = fallbackExtractSyllabus(syllabusText, subjectName);
    return {
      units: fallbackUnits,
      source: 'fallback',
      warning: 'Gemini API key is not configured. Topics extracted using PrepPilot deterministic pattern parser.',
    };
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
        temperature: 0.2,
      },
    });

    // Truncate to reasonable token limit (approx 25,000 characters)
    const truncatedText = syllabusText.length > 25000 ? syllabusText.slice(0, 25000) : syllabusText;

    const prompt = `You are an academic curriculum parser for PrepPilot, an adaptive AI study planner.
Analyze the following course syllabus text for the subject: "${subjectName}".
Extract the curriculum into structured units/chapters and individual topics.

Rules:
1. Group topics under their respective Unit, Module, Chapter, or Section name (e.g. "Unit 1 — Introduction to NLP", "Unit 2 — Text Representation"). If no unit headers exist, group them under a sensible unit name like "${subjectName} Fundamentals".
2. Under each unit, list the individual study topics.
3. For each topic:
   - "title": Clean, concise topic title (max 80 characters, no bullet points, no unit prefix).
   - "estimatedHours": Realistic study hours (between 1.0 and 4.0, default 2.0).
   - "difficulty": Integer difficulty rating from 1 (Very Easy) to 5 (Very Hard), default 3.
4. Return ONLY a valid JSON object conforming strictly to this JSON schema:
{
  "units": [
    {
      "unitName": "Unit 1 — Name",
      "topics": [
        {
          "title": "Topic title",
          "estimatedHours": 2,
          "difficulty": 3
        }
      ]
    }
  ]
}

Syllabus Text:
${truncatedText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawJson = response.text().trim();

    const parsed = JSON.parse(rawJson);

    if (!parsed || !Array.isArray(parsed.units) || parsed.units.length === 0) {
      throw new Error('Gemini returned an invalid units structure.');
    }

    // Sanitize and validate extracted units
    const sanitizedUnits = parsed.units
      .map((unit) => {
        const unitName = (unit.unitName || 'Core Topics').trim();
        const validTopics = (unit.topics || [])
          .map((t) => {
            const title = (t.title || '').trim().replace(/^[\u2022•\-\*—]\s*/, '');
            if (!title || title.length < 2) return null;
            return {
              title: title.slice(0, 100),
              estimatedHours: Math.min(10, Math.max(0.5, Number(t.estimatedHours) || 2)),
              difficulty: Math.min(5, Math.max(1, Math.round(Number(t.difficulty) || 3))),
            };
          })
          .filter(Boolean);

        return {
          unitName,
          title: unitName,
          topics: validTopics,
        };
      })
      .filter((u) => u.topics.length > 0);

    if (sanitizedUnits.length === 0) {
      throw new Error('No valid topics parsed from Gemini output.');
    }

    return {
      units: sanitizedUnits,
      source: 'ai',
    };
  } catch (error) {
    console.warn(`[Gemini Syllabus Extraction Error]: ${error.message}. Falling back to pattern-matching parser.`);
    const fallbackUnits = fallbackExtractSyllabus(syllabusText, subjectName);
    return {
      units: fallbackUnits,
      source: 'fallback',
      warning: `AI extraction unavailable (${error.message}). Topics extracted using pattern-matching.`,
    };
  }
};

module.exports = { generatePlanAdvice, getTopicStudyTip, extractSyllabusTopics, fallbackExtractSyllabus };

