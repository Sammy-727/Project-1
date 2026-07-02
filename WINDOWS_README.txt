WINDOWS QUICK START - GrandStay HMS
====================================

STEP 1 - Install Python (one time only)
---------------------------------------
Download Python 3.10 or newer from:
  https://www.python.org/downloads/

IMPORTANT: On the first installer screen, check:
  [x] Add python.exe to PATH

Then click "Install Now" and restart your computer.


STEP 2 - Extract the zip
------------------------
Right-click GrandStay-HMS-complete.zip > Extract All
Use a simple folder path, e.g.:
  C:\Users\YourName\Desktop\GrandStay-HMS

Avoid very deep paths if possible.


STEP 3 - Run the app
--------------------
Double-click ONE of these files:

  run_hms_v2.bat   (recommended)
  START.bat        (same thing)

Wait for the black window to show:
  "Starting GrandStay HMS..."
  "Running on http://127.0.0.1:5000"

Your browser should open automatically.


STEP 4 - Login
--------------
Open:  http://127.0.0.1:5000
User:  admin
Pass:  admin123

DO NOT close the black command window while using the app.


IF run_hms_v2.bat IS NOT RUNNING
---------------------------------
A) Window opens and closes instantly?
   -> Run TEST_SETUP.bat instead (shows the exact error)
   -> Install Python and enable PATH (Step 1)

B) "Python not found"?
   -> Reinstall Python with "Add to PATH" checked
   -> Restart PC

C) "pip install failed"?
   -> Open Command Prompt in this folder and run:
        python -m pip install Flask Werkzeug

D) Database error?
   -> Run RESET_DATABASE.bat
   -> Then run run_hms_v2.bat again

E) Windows blocked the file?
   -> Right-click run_hms_v2.bat > Properties
   -> If you see "Unblock", check it and click OK

F) Still broken?
   -> Run TEST_SETUP.bat
   -> Take a screenshot of ALL text in the window
   -> Send the screenshot for help
