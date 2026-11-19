/**
 * VALORA Healthcare Management Platform - DSA (Data Structures & Algorithms) Engine
 * Provides client-side Trie (Prefix Tree), Inverted Token Index, Fuzzy Levenshtein Distance,
 * and Binary Search for real-time instant searching, autocomplete, and filtering.
 */

class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.recordIds = new Set();
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word, recordId) {
    if (!word) return;
    let node = this.root;
    const clean = String(word).toLowerCase().trim();
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      node.recordIds.add(recordId);
    }
    node.isEndOfWord = true;
  }

  searchPrefix(prefix) {
    if (!prefix) return new Set();
    let node = this.root;
    const clean = String(prefix).toLowerCase().trim();
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (!node.children[char]) return new Set();
      node = node.children[char];
    }
    return node.recordIds;
  }
}

class InvertedIndex {
  constructor() {
    this.index = new Map();
    this.records = new Map();
  }

  tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .split(/[\s,._\-:;/()]+/)
      .filter(w => w.length > 0);
  }

  addRecord(id, fieldsArray, recordData) {
    this.records.set(id, recordData);
    fieldsArray.forEach(f => {
      const tokens = this.tokenize(f);
      tokens.forEach(tok => {
        if (!this.index.has(tok)) {
          this.index.set(tok, new Set());
        }
        this.index.get(tok).add(id);
      });
    });
  }

  search(query, matchAll = false) {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return Array.from(this.records.values());
    }

    const matchedSets = [];
    queryTokens.forEach(tok => {
      let tokenMatches = new Set();
      // Prefix matching on tokens in index
      for (let [idxToken, idsSet] of this.index.entries()) {
        if (idxToken.startsWith(tok) || dsaLevenshtein(idxToken, tok) <= 1 && tok.length > 3) {
          idsSet.forEach(id => tokenMatches.add(id));
        }
      }
      matchedSets.push(tokenMatches);
    });

    if (matchedSets.length === 0) return [];

    let resultSet = new Set();
    if (matchAll) {
      resultSet = matchedSets[0];
      for (let i = 1; i < matchedSets.length; i++) {
        resultSet = new Set([...resultSet].filter(x => matchedSets[i].has(x)));
      }
    } else {
      // Relevance scoring: count token matches
      const scoreMap = new Map();
      matchedSets.forEach(s => {
        s.forEach(id => {
          scoreMap.set(id, (scoreMap.get(id) || 0) + 1);
        });
      });
      // Sort IDs descending by score
      const sortedIds = Array.from(scoreMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      return sortedIds.map(id => this.records.get(id)).filter(Boolean);
    }

    return Array.from(resultSet).map(id => this.records.get(id)).filter(Boolean);
  }
}

/**
 * Levenshtein distance algorithm for fuzzy typo-tolerant searching
 */
function dsaLevenshtein(s1, s2) {
  s1 = String(s1).toLowerCase();
  s2 = String(s2).toLowerCase();
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Binary search on a sorted array of objects by numeric field
 */
function dsaBinarySearchRange(sortedArr, keyName, minVal, maxVal) {
  if (!sortedArr || sortedArr.length === 0) return [];

  // Binary search lower bound
  let low = 0, high = sortedArr.length - 1;
  let startIdx = sortedArr.length;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedArr[mid][keyName] >= minVal) {
      startIdx = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // Binary search upper bound
  low = 0; high = sortedArr.length - 1;
  let endIdx = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedArr[mid][keyName] <= maxVal) {
      endIdx = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (startIdx <= endIdx && startIdx < sortedArr.length && endIdx >= 0) {
    return sortedArr.slice(startIdx, endIdx + 1);
  }
  return [];
}
