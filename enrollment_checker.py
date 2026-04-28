#!/usr/bin/env python3
"""
LBS Enrollment Checker
Monitors https://ems.london.edu/ShortList every 5 minutes for the Generative AI class.

First run: opens a browser window so you can log in manually, then saves the session.
Subsequent runs: uses the saved session and checks silently every 5 minutes.
"""

import json
import os
import sys
import time
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

TARGET_URL = "https://ems.london.edu/ShortList"
SESSION_FILE = Path(__file__).parent / ".lbs_session.json"
CHECK_INTERVAL = 5 * 60  # 5 minutes in seconds

# Keywords to identify the Generative AI class
COURSE_KEYWORDS = ["generative ai", "gen ai", "generative artificial intelligence"]

# Keywords that indicate enrollment is open (case-insensitive)
ENROLL_KEYWORDS = ["enroll", "add to shortlist", "register", "sign up", "join"]

# Keywords that indicate enrollment is closed/unavailable
CLOSED_KEYWORDS = ["full", "closed", "waitlist", "not available", "unavailable"]


def alert(message: str):
    """Print a loud alert and attempt a system notification."""
    border = "=" * 60
    print(f"\n{border}")
    print(f"  ENROLLMENT ALERT")
    print(f"  {message}")
    print(f"{border}\n")
    # Terminal bell
    print("\a" * 5, end="", flush=True)
    # Try Linux desktop notification
    try:
        subprocess.run(
            ["notify-send", "-u", "critical", "-t", "0", "LBS Enrollment Alert", message],
            check=False,
            capture_output=True,
        )
    except FileNotFoundError:
        pass


def save_session(context):
    cookies = context.cookies()
    storage = context.storage_state()
    SESSION_FILE.write_text(json.dumps(storage))
    print(f"Session saved to {SESSION_FILE}")


def load_session_exists() -> bool:
    return SESSION_FILE.exists() and SESSION_FILE.stat().st_size > 10


def launch_browser(playwright, headless: bool):
    """Launch Chromium, falling back to system Chrome if Playwright's binary is missing."""
    try:
        return playwright.chromium.launch(headless=headless, slow_mo=100 if not headless else 0)
    except Exception:
        # Fall back to system-installed Chrome/Chromium
        for channel in ("chrome", "msedge", "chromium"):
            try:
                return playwright.chromium.launch(
                    headless=headless,
                    channel=channel,
                    slow_mo=100 if not headless else 0,
                )
            except Exception:
                continue
        raise RuntimeError(
            "No Chromium browser found. Run: python3 -m playwright install chromium\n"
            "Or install Google Chrome and retry."
        )


def login_and_save_session(playwright):
    """Open a visible browser for manual login, then save the session."""
    print("\nNo saved session found. Opening browser for manual login...")
    print("Please log in to https://ems.london.edu/ShortList in the browser window.")
    print("Once you can see the ShortList page, press ENTER here to save your session.\n")

    browser = launch_browser(playwright, headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=60000)

    input("Press ENTER after you have fully logged in and the ShortList page is visible: ")

    save_session(context)
    browser.close()
    print("Login session saved. Starting monitoring...\n")


def find_generative_ai_status(page) -> dict:
    """
    Scan the page for Generative AI course info.
    Returns dict with keys: found (bool), can_enroll (bool), details (str)
    """
    page_text = page.inner_text("body").lower()

    # Check if we've been logged out
    if any(kw in page_text for kw in ["sign in", "log in", "login", "username"]):
        return {"found": False, "can_enroll": False, "details": "SESSION_EXPIRED"}

    # Find the Generative AI course
    course_found = any(kw in page_text for kw in COURSE_KEYWORDS)
    if not course_found:
        return {"found": False, "can_enroll": False, "details": "Course not listed on page"}

    # Try to find the specific section containing the course
    # Look for elements that match the course name
    course_elements = []
    for kw in COURSE_KEYWORDS:
        try:
            matches = page.locator(f"text=/{kw}/i").all()
            course_elements.extend(matches)
        except Exception:
            pass

    # Check for enroll/add buttons near the course listing
    can_enroll = False
    status_detail = "Course found but enrollment status unclear"

    # Check for enabled enroll-type buttons/links in the whole page context
    for enroll_kw in ENROLL_KEYWORDS:
        try:
            btns = page.locator(f"button:has-text('{enroll_kw}'), a:has-text('{enroll_kw}')").all()
            for btn in btns:
                if btn.is_enabled() and btn.is_visible():
                    can_enroll = True
                    status_detail = f"Enrollment action found: '{btn.inner_text().strip()}'"
                    break
        except Exception:
            pass
        if can_enroll:
            break

    # Check for closed indicators near the course
    is_closed = any(kw in page_text for kw in CLOSED_KEYWORDS)

    if not can_enroll and is_closed:
        status_detail = "Course found — currently full/closed/waitlist only"

    return {"found": True, "can_enroll": can_enroll, "details": status_detail}


def check_once(playwright) -> bool:
    """
    Load the ShortList page with saved session and check enrollment.
    Returns True if enrollment is open (so we can stop the loop).
    """
    if not load_session_exists():
        print("Session file missing. Re-running login flow.")
        login_and_save_session(playwright)

    storage_state = json.loads(SESSION_FILE.read_text())

    browser = launch_browser(playwright, headless=True)
    context = browser.new_context(storage_state=storage_state)
    page = context.new_page()

    try:
        page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)  # let dynamic content settle

        result = find_generative_ai_status(page)

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

        if result["details"] == "SESSION_EXPIRED":
            print(f"[{timestamp}] Session expired. Triggering re-login...")
            browser.close()
            SESSION_FILE.unlink(missing_ok=True)
            login_and_save_session(playwright)
            return False

        if result["found"] and result["can_enroll"]:
            alert(
                f"Generative AI class enrollment is OPEN!\n"
                f"  Go to: {TARGET_URL}\n"
                f"  Detail: {result['details']}"
            )
            browser.close()
            return True  # stop the loop

        status = "OPEN - ENROLL NOW" if result["can_enroll"] else result["details"]
        print(f"[{timestamp}] Generative AI found: {result['found']} | Status: {status}")

    except Exception as e:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Error during check: {e}")
    finally:
        try:
            browser.close()
        except Exception:
            pass

    return False


def main():
    print("LBS Generative AI Enrollment Checker")
    print(f"Monitoring: {TARGET_URL}")
    print(f"Check interval: {CHECK_INTERVAL // 60} minutes")
    print("Press Ctrl+C to stop.\n")

    with sync_playwright() as playwright:
        # First run: login if no session
        if not load_session_exists():
            login_and_save_session(playwright)

        check_count = 0
        while True:
            check_count += 1
            print(f"Check #{check_count}...", end=" ", flush=True)
            done = check_once(playwright)
            if done:
                print("Enrollment is open! Monitoring stopped.")
                break
            print(f"Sleeping {CHECK_INTERVAL // 60}m...")
            try:
                time.sleep(CHECK_INTERVAL)
            except KeyboardInterrupt:
                print("\nStopped by user.")
                sys.exit(0)


if __name__ == "__main__":
    main()
