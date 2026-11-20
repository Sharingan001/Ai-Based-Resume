#pragma once
#include <algorithm>
#include <stdexcept>
#include <cmath>

namespace nexus {
struct Scores { double semantic, skills, experience, education; };
inline double rank_score(Scores s) {
    for (double v : {s.semantic, s.skills, s.experience, s.education})
        if (!std::isfinite(v) || v < 0 || v > 100)
            throw std::invalid_argument("All score components must be between 0 and 100");
    return std::floor(std::min(99.9, .55*s.semantic + .25*s.skills + .10*s.experience + .10*s.education)*10 + .5 + 1e-9)/10;
}
}
