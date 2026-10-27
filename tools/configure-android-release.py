#!/usr/bin/env python3
"""Configure Tauri-generated Android Gradle project for a signed release APK."""
from pathlib import Path

path = Path("src-tauri/gen/android/app/build.gradle.kts")
src = path.read_text(encoding="utf-8")
if "signingConfigs.getByName(\"release\")" in src:
    print("Release signing already configured")
    raise SystemExit(0)

if "import java.io.FileInputStream" not in src:
    src = "import java.io.FileInputStream\nimport java.util.Properties\n" + src

anchor = "    buildTypes {"
if anchor not in src:
    raise SystemExit("Could not locate android.buildTypes in generated Gradle file")

block = """    signingConfigs {
        create("release") {
            val propertiesFile = rootProject.file("keystore.properties")
            require(propertiesFile.isFile) { "Missing keystore.properties" }
            val signing = Properties()
            FileInputStream(propertiesFile).use { signing.load(it) }
            keyAlias = signing.getProperty("keyAlias")
            keyPassword = signing.getProperty("password")
            storeFile = file(signing.getProperty("storeFile"))
            storePassword = signing.getProperty("password")
        }
    }
"""
src = src.replace(anchor, block + anchor, 1)
release = '        getByName("release") {'
if release not in src:
    raise SystemExit("Could not locate release build type in generated Gradle file")
src = src.replace(release, release + '\n            signingConfig = signingConfigs.getByName("release")', 1)
path.write_text(src, encoding="utf-8")
print("Release Gradle signing enabled")
