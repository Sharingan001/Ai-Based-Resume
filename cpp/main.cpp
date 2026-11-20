#include "scoring.hpp"
#include <iostream>
#include <string>
int main(int argc, char** argv) {
    if (argc != 5) {
        std::cerr << "Usage: nexus_score SEMANTIC SKILLS EXPERIENCE EDUCATION\n";
        return 2;
    }
    try {
        double v[4];
        for (int i=0; i<4; ++i) {
            std::string argument(argv[i+1]);
            std::size_t consumed=0;
            v[i]=std::stod(argument, &consumed);
            if (consumed != argument.size()) throw std::invalid_argument("Invalid number");
        }
        std::cout << nexus::rank_score({v[0],v[1],v[2],v[3]}) << '\n';
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}
