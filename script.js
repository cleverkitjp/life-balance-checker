// script.js

// 学年グループ別のモデル値（時間単位：時間）
const GRADE_MODELS = {
  elem_low: {
    label: "小1〜小3",
    grades: ["小1", "小2", "小3"],
    ranges: {
      sleep:   { min: 9.0,  max: 11.0 },
      study:   { min: 0.5,  max: 1.0 },
      exercise:{ min: 0.5,  max: 1.0 },
      screen:  { min: 0.0,  max: 1.0 },
      reading: { min: 0.1,  max: 0.5 } // 6〜30分
    }
  },
  elem_high: {
    label: "小4〜小6",
    grades: ["小4", "小5", "小6"],
    ranges: {
      sleep:   { min: 9.0,  max: 11.0 },
      study:   { min: 1.0,  max: 1.5 },
      exercise:{ min: 0.5,  max: 1.0 },
      screen:  { min: 0.0,  max: 1.5 },
      reading: { min: 0.2,  max: 0.6 } // 12〜36分
    }
  },
  junior: {
    label: "中1〜中3",
    grades: ["中1", "中2", "中3"],
    ranges: {
      sleep:   { min: 8.0,  max: 10.0 },
      study:   { min: 1.0,  max: 2.0 },
      exercise:{ min: 0.5,  max: 1.0 },
      screen:  { min: 1.0,  max: 2.5 },
      reading: { min: 0.1,  max: 0.5 } // 6〜30分
    }
  },
  senior: {
    label: "高1〜高3",
    grades: ["高1", "高2", "高3"],
    ranges: {
      sleep:   { min: 8.0,  max: 10.0 },
      study:   { min: 1.5,  max: 3.0 },
      exercise:{ min: 0.5,  max: 1.0 },
      screen:  { min: 2.0,  max: 3.0 },
      reading: { min: 0.0,  max: 0.3 } // 0〜18分
    }
  }
};

// 各項目の設定
// type: "sleep" | "hours" | "minutes"
const ITEM_CONFIG = {
  sleep: {
    type: "sleep",
    label: "睡眠",
    emoji: "🛌"
  },
  study: {
    type: "hours",
    label: "家庭学習",
    emoji: "✍️",
    inputId: "studyInput",
    rangeId: "studyRange"
  },
  exercise: {
    type: "hours",
    label: "運動",
    emoji: "🏃",
    inputId: "exerciseInput",
    rangeId: "exerciseRange"
  },
  screen: {
    type: "hours",
    label: "スマホ・ゲーム",
    emoji: "📱",
    inputId: "screenInput",
    rangeId: "screenRange"
  },
  reading: {
    type: "minutes",
    label: "読書",
    emoji: "📖",
    inputId: "readingMinutesInput"
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const gradeSelect = document.getElementById("gradeSelect");
  const calculateBtn = document.getElementById("calculateBtn");
  const errorMessageEl = document.getElementById("errorMessage");
  const referenceToggle = document.getElementById("referenceToggle");
  const referenceContent = document.getElementById("referenceContent");

  const bedTimeEl = document.getElementById("bedTime");
  const wakeTimeEl = document.getElementById("wakeTime");
  const sleepHourDisplayEl = document.getElementById("sleepHourDisplay");

  // スライダーと数値入力の同期（hoursタイプのみ）
  Object.keys(ITEM_CONFIG).forEach((key) => {
    const cfg = ITEM_CONFIG[key];
    if (cfg.type !== "hours") return;

    const numberEl = document.getElementById(cfg.inputId);
    const rangeEl = document.getElementById(cfg.rangeId);

    if (!numberEl || !rangeEl) return;

    rangeEl.addEventListener("input", () => {
      numberEl.value = rangeEl.value;
    });

    numberEl.addEventListener("input", () => {
      const v = numberEl.value;
      if (v === "" || isNaN(parseFloat(v))) {
        return;
      }
      rangeEl.value = v;
    });
  });

  // 睡眠：就寝・起床時刻が変わったら推定睡眠時間を表示
  function updateSleepDisplay() {
    const hours = calculateSleepHours(bedTimeEl.value, wakeTimeEl.value);
    if (hours == null || isNaN(hours)) {
      sleepHourDisplayEl.textContent = "推定睡眠時間：– 時間";
      return;
    }
    if (hours <= 0 || hours > 16) {
      sleepHourDisplayEl.textContent = "推定睡眠時間：計算結果が不自然です。入力を確認してください。";
      return;
    }
    const display = Math.round(hours * 10) / 10; // 1桁小数
    sleepHourDisplayEl.textContent = "推定睡眠時間：" + display + " 時間";
  }

  if (bedTimeEl && wakeTimeEl) {
    bedTimeEl.addEventListener("change", updateSleepDisplay);
    wakeTimeEl.addEventListener("change", updateSleepDisplay);
    bedTimeEl.addEventListener("input", updateSleepDisplay);
    wakeTimeEl.addEventListener("input", updateSleepDisplay);
  }

  // 結果を見るボタン
  calculateBtn.addEventListener("click", () => {
    errorMessageEl.textContent = "";

    const selectedGrade = gradeSelect.value;
    if (!selectedGrade) {
      errorMessageEl.textContent = "学年を選択してください。";
      return;
    }

    const groupKey = getGradeGroupByGrade(selectedGrade);
    const groupModel = GRADE_MODELS[groupKey];
    if (!groupModel) {
      errorMessageEl.textContent = "学年の判定に失敗しました。";
      return;
    }

    // 睡眠時間（時間数）の計算
    const sleepHours = calculateSleepHours(bedTimeEl.value, wakeTimeEl.value);
    if (sleepHours == null || isNaN(sleepHours)) {
      errorMessageEl.textContent = "睡眠の就寝・起床時刻を両方入力してください。";
      return;
    }
    if (sleepHours <= 0 || sleepHours > 16) {
      errorMessageEl.textContent = "睡眠時間の計算結果が不自然です。入力を確認してください。";
      return;
    }

    const userValues = {};
    userValues["sleep"] = sleepHours;

    let hasError = false;

    // その他の項目（hours / minutes）
    Object.keys(ITEM_CONFIG).forEach((key) => {
      const cfg = ITEM_CONFIG[key];
      if (cfg.type === "sleep") return;

      const inputEl = document.getElementById(cfg.inputId);
      if (!inputEl) return;

      const raw = String(inputEl.value || "").trim();
      const value = parseFloat(raw);

      if (raw === "" || isNaN(value)) {
        hasError = true;
        return;
      }

      if (cfg.type === "hours") {
        if (value < 0 || value > 24) {
          hasError = true;
          return;
        }
        userValues[key] = value;
      } else if (cfg.type === "minutes") {
        if (value < 0 || value > 120) { // 読書は0〜120分を想定
          hasError = true;
          return;
        }
        const hours = value / 60.0;
        userValues[key] = hours;
      }
    });

    if (hasError) {
      errorMessageEl.textContent =
        "0以上の適切な値で、すべての項目に数値を入力してください。";
      return;
    }

    // 項目別評価
    const itemResults = {};
    const levels = [];

    Object.keys(ITEM_CONFIG).forEach((key) => {
      const rangeCfg = groupModel.ranges[key];
      if (!rangeCfg) return;

      const value = userValues[key];
      const result = evaluateItem(value, rangeCfg);
      itemResults[key] = result;
      levels.push(result.level);
    });

    // 総合評価
    const overall = calculateOverall(levels);

    // 結果描画
    renderResults(selectedGrade, itemResults, overall);
  });

  // 参考データのトグル
  referenceToggle.addEventListener("click", () => {
    referenceContent.classList.toggle("open");
  });
});

// 学年→グループ判定
function getGradeGroupByGrade(grade) {
  if (GRADE_MODELS.elem_low.grades.includes(grade)) return "elem_low";
  if (GRADE_MODELS.elem_high.grades.includes(grade)) return "elem_high";
  if (GRADE_MODELS.junior.grades.includes(grade)) return "junior";
  if (GRADE_MODELS.senior.grades.includes(grade)) return "senior";
  return null;
}

// 就寝・起床時刻から睡眠時間（時間）を計算
function calculateSleepHours(bedTimeStr, wakeTimeStr) {
  if (!bedTimeStr || !wakeTimeStr) return null;

  const bedParts = bedTimeStr.split(":");
  const wakeParts = wakeTimeStr.split(":");
  if (bedParts.length !== 2 || wakeParts.length !== 2) return null;

  const bh = parseInt(bedParts[0], 10);
  const bm = parseInt(bedParts[1], 10);
  const wh = parseInt(wakeParts[0], 10);
  const wm = parseInt(wakeParts[1], 10);

  if (
    isNaN(bh) || isNaN(bm) ||
    isNaN(wh) || isNaN(wm) ||
    bh < 0 || bh > 23 || wh < 0 || wh > 23 ||
    bm < 0 || bm > 59 || wm < 0 || wm > 59
  ) {
    return null;
  }

  const bed = bh + bm / 60;
  const wake = wh + wm / 60;

  let hours = wake - bed;
  if (hours <= 0) {
    hours += 24;
  }
  return hours;
}

// 項目別の5段階評価
function evaluateItem(value, rangeCfg) {
  const min = rangeCfg.min;
  const max = rangeCfg.max;
  const mid = (min + max) / 2;
  const width = Math.max(max - min, 0.1); // 0除算回避
  const diff = Math.abs(value - mid);
  const ratio = diff / width;

  let level = 0;
  if (ratio <= 0.10) {
    level = 0; // ◎
  } else if (ratio <= 0.25) {
    level = 1; // ◯
  } else if (ratio <= 0.5) {
    level = 2; // △
  } else if (ratio <= 1.0) {
    level = 3; // ▲
  } else {
    level = 4; // ■
  }

  const mark = ["◎", "◯", "△", "▲", "■"][level];

  // ベースコメント（方向性に依存しない）
  let baseComment = "";
  switch (level) {
    case 0:
      baseComment =
        "とても良いバランスです。学年の目安にしっかりおさまっています。";
      break;
    case 1:
      baseComment =
        "おおむね目安の範囲にあります。この調子で続けられそうです。";
      break;
    case 2:
      baseComment =
        "少し目安から外れていますが、無理のない範囲で調整できそうです。";
      break;
    case 3:
      baseComment =
        "やや偏りがあります。気になる場合は少しだけ見直してみるのも良いかもしれません。";
      break;
    default:
      baseComment =
        "目安とは離れていますが、生活リズムは家庭ごとに違って大丈夫です。様子を見ながら整えていきましょう。";
      break;
  }

  // 少なめ／多めの傾向テキスト（柔らかく）
  let tendencyText = "";
  if (value < min) {
    tendencyText = "目安より少なめです。";
  } else if (value > max) {
    tendencyText = "目安より多めです。";
  } else if (value < mid) {
    tendencyText = "目安の中でもやや少なめです。";
  } else if (value > mid) {
    tendencyText = "目安の中でもやや多めです。";
  } else {
    tendencyText = "おおむね真ん中付近です。";
  }

  const fullComment = tendencyText + " " + baseComment;

  return {
    level,
    mark,
    baseComment,
    tendencyText,
    fullComment
  };
}

// レベル→スコア（総合評価用）
function levelToScore(level) {
  const scores = [4, 3, 2, 1, 0]; // ◎〜■
  if (level < 0 || level >= scores.length) return 0;
  return scores[level];
}

// 総合評価（A〜E）
function calculateOverall(levels) {
  let total = 0;
  levels.forEach((lv) => {
    total += levelToScore(lv);
  });

  let grade = "C";
  let comment = "";

  if (total >= 18) { // 5項目 × 4点 = 20点
    grade = "A";
    comment =
      "とても整った生活リズムです。今のバランスを大切にしていけそうです。";
  } else if (total >= 14) {
    grade = "B";
    comment =
      "おおむね良い生活リズムです。気になる項目があれば、少し意識してみるとさらに安定します。";
  } else if (total >= 10) {
    grade = "C";
    comment =
      "良い部分と見直しポイントが半々くらいです。無理のない範囲で少しずつ整えていきましょう。";
  } else if (total >= 6) {
    grade = "D";
    comment =
      "生活リズムの気づきが得られそうです。気になる項目から一つずつ見直してみると良いかもしれません。";
  } else {
    grade = "E";
    comment =
      "いくつか目安との差がありますが、生活は家庭ごとに違って大丈夫です。必要に応じて学校や専門家にも相談しながら、無理のない調整を心がけてみてください。";
  }

  return {
    grade,
    comment,
    total
  };
}

// 結果の描画
function renderResults(selectedGrade, itemResults, overall) {
  const resultsSection = document.getElementById("resultsSection");
  const detailSection = document.getElementById("detailSection");
  const overallGradeEl = document.getElementById("overallGrade");
  const overallCommentEl = document.getElementById("overallComment");
  const detailListEl = document.getElementById("detailResults");

  if (!resultsSection || !detailSection) return;

  // 総合評価
  overallGradeEl.textContent = overall.grade;
  overallCommentEl.textContent = overall.comment;

  // 項目別リスト
  detailListEl.innerHTML = "";

  Object.keys(ITEM_CONFIG).forEach((key) => {
    const cfg = ITEM_CONFIG[key];
    const result = itemResults[key];
    if (!result) return;

    const li = document.createElement("li");

    // 1行目：ラベル＋マーク
    const headerDiv = document.createElement("div");
    headerDiv.className = "detail-header";

    const labelSpan = document.createElement("span");
    labelSpan.className = "detail-label";
    labelSpan.textContent = cfg.emoji + " " + cfg.label;

    const markSpan = document.createElement("span");
    markSpan.className = "detail-mark";
    markSpan.textContent = result.mark;

    headerDiv.appendChild(labelSpan);
    headerDiv.appendChild(markSpan);

    // 2行目：コメント
    const commentP = document.createElement("p");
    commentP.className = "detail-comment";
    commentP.textContent = result.fullComment;

    li.appendChild(headerDiv);
    li.appendChild(commentP);
    detailListEl.appendChild(li);
  });

  // セクションを表示
  resultsSection.classList.remove("hidden");
  detailSection.classList.remove("hidden");
}
