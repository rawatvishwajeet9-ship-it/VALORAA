"""
VALORA Healthcare Management Platform - Data Structures & Algorithms (DSA) Engine
Provides algorithmic indexing, prefix trees (Trie), inverted multi-token index, and fuzzy matching.
"""

import re
from typing import List, Dict, Any, Set, Tuple

class TrieNode:
    def __init__(self):
        self.children: Dict[str, TrieNode] = {}
        self.is_end_of_word: bool = False
        self.record_ids: Set[int] = set()

class Trie:
    """Prefix Tree for O(L) prefix search and autocomplete."""
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str, record_id: int):
        if not word:
            return
        node = self.root
        clean_word = word.lower().strip()
        for char in clean_word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            node.record_ids.add(record_id)
        node.is_end_of_word = True

    def search_prefix(self, prefix: str) -> Set[int]:
        if not prefix:
            return set()
        node = self.root
        clean_prefix = prefix.lower().strip()
        for char in clean_prefix:
            if char not in node.children:
                return set()
            node = node.children[char]
        return set(node.record_ids)

class InvertedIndex:
    """Inverted Index mapping tokens to document IDs for multi-field fast retrieval."""
    def __init__(self):
        self.index: Dict[str, Set[int]] = {}
        self.records: Dict[int, Any] = {}

    def _tokenize(self, text: str) -> List[str]:
        if not text:
            return []
        return [w for w in re.split(r'[\s,._\-:;/()]+', text.lower()) if len(w) > 1]

    def add_record(self, record_id: int, text_fields: List[str], record_data: Any = None):
        self.records[record_id] = record_data
        for field in text_fields:
            tokens = self._tokenize(str(field or ""))
            for token in tokens:
                if token not in self.index:
                    self.index[token] = set()
                self.index[token].add(record_id)

    def search(self, query: str, match_all: bool = False) -> List[int]:
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return list(self.records.keys())

        result_sets = [self.index.get(tok, set()) for tok in query_tokens]
        if not result_sets:
            return []

        if match_all:
            # Intersection (AND)
            final_set = set.intersection(*result_sets)
        else:
            # Union (OR) with scoring by frequency
            freq: Dict[int, int] = {}
            for s in result_sets:
                for r_id in s:
                    freq[r_id] = freq.get(r_id, 0) + 1
            # Sort by highest token match count
            sorted_items = sorted(freq.items(), key=lambda x: x[1], reverse=True)
            return [item[0] for item in sorted_items]

        return list(final_set)

def levenshtein_distance(s1: str, s2: str) -> int:
    """Dynamic Programming Levenshtein distance for fuzzy clinical term search."""
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i - 1].lower() == s2[j - 1].lower():
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    return dp[m][n]

def binary_search_range(sorted_items: List[Tuple[float, Any]], min_val: float, max_val: float) -> List[Any]:
    """Binary search over sorted (numeric_key, item) pairs to efficiently filter ranges."""
    import bisect
    keys = [item[0] for item in sorted_items]
    left = bisect.bisect_left(keys, min_val)
    right = bisect.bisect_right(keys, max_val)
    return [sorted_items[i][1] for i in range(left, right)]
