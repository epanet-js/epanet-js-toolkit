#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <string>
#include <stdexcept>

extern "C" {
    #include "epanet2_2.h"
}

#ifdef EPANETMSX_H
extern "C" {
    #include "epanetmsx.h"
}
#endif

using namespace emscripten;

// Error checking helper - throws JS exception on error
void checkError(int err, const char* funcName) {
    if (err != 0) {
        char msg[256];
        MSXgeterror(err, msg, 255);
        std::string errorMsg = std::string(funcName) + ": " + msg;
        throw std::runtime_error(errorMsg);
    }
}

void checkENError(int err, const char* funcName) {
    if (err > 100) {  // EPANET warnings are < 100
        throw std::runtime_error(std::string(funcName) + ": EPANET error " + std::to_string(err));
    }
}

/**
 * Low-level wrapper class for EPANET + MSX
 * This class is used by the TypeScript MSXProject class
 */
class EpanetMSXEngine {
private:
    EN_Project enProject;
    bool isEnOpen;
    bool isMsxOpen;

public:
    EpanetMSXEngine() : enProject(nullptr), isEnOpen(false), isMsxOpen(false) {
        int err = EN_createproject(&enProject);
        checkENError(err, "EN_createproject");
    }

    ~EpanetMSXEngine() {
        if (isMsxOpen) {
            MSXclose();
        }
        if (isEnOpen) {
            EN_close(enProject);
        }
        if (enProject) {
            EN_deleteproject(enProject);
        }
    }

    // ==========================================
    // EPANET Functions (matching epanet-js API)
    // ==========================================

    void open(const std::string& inpFile, const std::string& rptFile, const std::string& outFile) {
        int err = EN_open(enProject, inpFile.c_str(), rptFile.c_str(), outFile.c_str());
        checkENError(err, "open");
        isEnOpen = true;
    }

    void close() {
        if (isMsxOpen) {
            MSXclose();
            isMsxOpen = false;
        }
        if (isEnOpen) {
            EN_close(enProject);
            isEnOpen = false;
        }
    }

    void solveH() {
        int err = EN_solveH(enProject);
        checkENError(err, "solveH");
    }

    void openH() {
        int err = EN_openH(enProject);
        checkENError(err, "openH");
    }

    void initH(int initFlag) {
        int err = EN_initH(enProject, initFlag);
        checkENError(err, "initH");
    }

    double runH() {
        long t;
        int err = EN_runH(enProject, &t);
        checkENError(err, "runH");
        return static_cast<double>(t);
    }

    double nextH() {
        long tstep;
        int err = EN_nextH(enProject, &tstep);
        checkENError(err, "nextH");
        return static_cast<double>(tstep);
    }

    void closeH() {
        int err = EN_closeH(enProject);
        checkENError(err, "closeH");
    }

    void saveH() {
        int err = EN_saveH(enProject);
        checkENError(err, "saveH");
    }

    int getCount(int type) {
        int count;
        int err = EN_getcount(enProject, type, &count);
        checkENError(err, "getCount");
        return count;
    }

    int getNodeIndex(const std::string& id) {
        int index;
        int err = EN_getnodeindex(enProject, id.c_str(), &index);
        checkENError(err, "getNodeIndex");
        return index;
    }

    std::string getNodeId(int index) {
        char id[32];
        int err = EN_getnodeid(enProject, index, id);
        checkENError(err, "getNodeId");
        return std::string(id);
    }

    double getNodeValue(int index, int property) {
        double value;
        int err = EN_getnodevalue(enProject, index, property, &value);
        checkENError(err, "getNodeValue");
        return value;
    }

    int getLinkIndex(const std::string& id) {
        int index;
        int err = EN_getlinkindex(enProject, id.c_str(), &index);
        checkENError(err, "getLinkIndex");
        return index;
    }

    std::string getLinkId(int index) {
        char id[32];
        int err = EN_getlinkid(enProject, index, id);
        checkENError(err, "getLinkId");
        return std::string(id);
    }

    double getLinkValue(int index, int property) {
        double value;
        int err = EN_getlinkvalue(enProject, index, property, &value);
        checkENError(err, "getLinkValue");
        return value;
    }

    // ==========================================
    // MSX Functions
    // ==========================================

    void msxOpen(const std::string& msxFile) {
        int err = MSXopen((char *)msxFile.c_str());
        checkError(err, "msxOpen");
        isMsxOpen = true;
    }

    void msxClose() {
        if (isMsxOpen) {
            int err = MSXclose();
            checkError(err, "msxClose");
            isMsxOpen = false;
        }
    }

    void msxSolveH() {
        int err = MSXsolveH();
        checkError(err, "msxSolveH");
    }

    void msxSolveQ() {
        int err = MSXsolveQ();
        checkError(err, "msxSolveQ");
    }

    void msxInit(int saveFlag) {
        int err = MSXinit(saveFlag);
        checkError(err, "msxInit");
    }

    val msxStep() {
        double t, tleft;
        int err = MSXstep(&t, &tleft);
        checkError(err, "msxStep");

        val result = val::object();
        result.set("t", t);
        result.set("tleft", tleft);
        return result;
    }

    void msxReport() {
        int err = MSXreport();
        checkError(err, "msxReport");
    }

    void msxSaveOutFile(const std::string& filename) {
        int err = MSXsaveoutfile((char *)filename.c_str());
        checkError(err, "msxSaveOutFile");
    }

    int msxGetCount(int type) {
        int count;
        int err = MSXgetcount(type, &count);
        checkError(err, "msxGetCount");
        return count;
    }

    int msxGetSpeciesIndex(const std::string& id) {
        int index;
        int err = MSXgetindex(MSX_SPECIES, (char *)id.c_str(), &index);
        checkError(err, "msxGetSpeciesIndex");
        return index;
    }

    std::string msxGetSpeciesId(int index) {
        char id[32];
        int err = MSXgetID(MSX_SPECIES, index, id, 31);
        checkError(err, "msxGetSpeciesId");
        return std::string(id);
    }

    val msxGetSpecies(int index) {
        int type;
        char units[16];
        double aTol, rTol;
        int err = MSXgetspecies(index, &type, units, &aTol, &rTol);
        checkError(err, "msxGetSpecies");

        val result = val::object();
        result.set("type", type);
        result.set("units", std::string(units));
        result.set("aTol", aTol);
        result.set("rTol", rTol);
        return result;
    }

    double msxGetConstant(int index) {
        double value;
        int err = MSXgetconstant(index, &value);
        checkError(err, "msxGetConstant");
        return value;
    }

    void msxSetConstant(int index, double value) {
        int err = MSXsetconstant(index, value);
        checkError(err, "msxSetConstant");
    }

    double msxGetParameter(int objType, int linkIndex, int paramIndex) {
        double value;
        int err = MSXgetparameter(objType, linkIndex, paramIndex, &value);
        checkError(err, "msxGetParameter");
        return value;
    }

    void msxSetParameter(int objType, int objIndex, int paramIndex, double value) {
        int err = MSXsetparameter(objType, objIndex, paramIndex, value);
        checkError(err, "msxSetParameter");
    }

    double msxGetInitQual(int objType, int nodeIndex, int speciesIndex) {
        double value;
        int err = MSXgetinitqual(objType, nodeIndex, speciesIndex, &value);
        checkError(err, "msxGetInitQual");
        return value;
    }

    void msxSetInitQual(int objType, int objIndex, int speciesIndex, double value) {
        int err = MSXsetinitqual(objType, objIndex, speciesIndex, value);
        checkError(err, "msxSetInitQual");
    }

    val msxGetSource(int nodeIndex, int speciesIndex) {
        int type, patIndex;
        double level;
        int err = MSXgetsource(nodeIndex, speciesIndex, &type, &level, &patIndex);
        checkError(err, "msxGetSource");

        val result = val::object();
        result.set("type", type);
        result.set("level", level);
        result.set("patternIndex", patIndex);
        return result;
    }

    void msxSetSource(int nodeIndex, int speciesIndex, int type, double level, int patIndex) {
        int err = MSXsetsource(nodeIndex, speciesIndex, type, level, patIndex);
        checkError(err, "msxSetSource");
    }

    double msxGetQual(int type, int index, int speciesIndex) {
        double value;
        int err = MSXgetqual(type, index, speciesIndex, &value);
        checkError(err, "msxGetQual");
        return value;
    }

    std::string msxGetError(int errorCode) {
        char msg[256];
        int err = MSXgeterror(errorCode, msg, 255);
        return std::string(msg);
    }
};

// Embind bindings
EMSCRIPTEN_BINDINGS(epanetmsx_engine) {
    class_<EpanetMSXEngine>("EpanetMSXEngine")
        .constructor<>()
        // EPANET methods
        .function("open", &EpanetMSXEngine::open)
        .function("close", &EpanetMSXEngine::close)
        .function("solveH", &EpanetMSXEngine::solveH)
        .function("openH", &EpanetMSXEngine::openH)
        .function("initH", &EpanetMSXEngine::initH)
        .function("runH", &EpanetMSXEngine::runH)
        .function("nextH", &EpanetMSXEngine::nextH)
        .function("closeH", &EpanetMSXEngine::closeH)
        .function("saveH", &EpanetMSXEngine::saveH)
        .function("getCount", &EpanetMSXEngine::getCount)
        .function("getNodeIndex", &EpanetMSXEngine::getNodeIndex)
        .function("getNodeId", &EpanetMSXEngine::getNodeId)
        .function("getNodeValue", &EpanetMSXEngine::getNodeValue)
        .function("getLinkIndex", &EpanetMSXEngine::getLinkIndex)
        .function("getLinkId", &EpanetMSXEngine::getLinkId)
        .function("getLinkValue", &EpanetMSXEngine::getLinkValue)
        // MSX methods
        .function("msxOpen", &EpanetMSXEngine::msxOpen)
        .function("msxClose", &EpanetMSXEngine::msxClose)
        .function("msxSolveH", &EpanetMSXEngine::msxSolveH)
        .function("msxSolveQ", &EpanetMSXEngine::msxSolveQ)
        .function("msxInit", &EpanetMSXEngine::msxInit)
        .function("msxStep", &EpanetMSXEngine::msxStep)
        .function("msxReport", &EpanetMSXEngine::msxReport)
        .function("msxSaveOutFile", &EpanetMSXEngine::msxSaveOutFile)
        .function("msxGetCount", &EpanetMSXEngine::msxGetCount)
        .function("msxGetSpeciesIndex", &EpanetMSXEngine::msxGetSpeciesIndex)
        .function("msxGetSpeciesId", &EpanetMSXEngine::msxGetSpeciesId)
        .function("msxGetSpecies", &EpanetMSXEngine::msxGetSpecies)
        .function("msxGetConstant", &EpanetMSXEngine::msxGetConstant)
        .function("msxSetConstant", &EpanetMSXEngine::msxSetConstant)
        .function("msxGetParameter", &EpanetMSXEngine::msxGetParameter)
        .function("msxSetParameter", &EpanetMSXEngine::msxSetParameter)
        .function("msxGetInitQual", &EpanetMSXEngine::msxGetInitQual)
        .function("msxSetInitQual", &EpanetMSXEngine::msxSetInitQual)
        .function("msxGetSource", &EpanetMSXEngine::msxGetSource)
        .function("msxSetSource", &EpanetMSXEngine::msxSetSource)
        .function("msxGetQual", &EpanetMSXEngine::msxGetQual)
        .function("msxGetError", &EpanetMSXEngine::msxGetError);
}
