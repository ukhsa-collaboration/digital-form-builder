curl -L https://tunnelmole.com/downloads/tmole-mac.gz --output tmole-mac.gz
gunzip tmole-mac.gz && mv tmole-mac tmole
chmod +x tmole

# If /usr/local/bin does not exist, create it e.g. for Catalina this folder is in the PATH but it does not exist
mkdir -p /usr/local/bin

mv tmole /usr/local/bin/tmole
ln -sf /usr/local/bin/tmole /usr/local/bin/tunnelmole

# Try to run tmole, no output
tmole > /dev/null

# If tmole ran succesfully, show error message or show installation failed message if not
if [ $? -eq 0 ]
then
    echo "  _______                     _                 _      ";
    echo " |__   __|                   | |               | |     ";
    echo "    | |_   _ _ __  _ __   ___| |_ __ ___   ___ | | ___ ";
    echo "    | | | | | '_ \| '_ \ / _ \ | '_ \` _ \ / _ \| |/ _ \ ";
    echo "    | | |_| | | | | | | |  __/ | | | | | | (_) | |  __/";
    echo "    |_|\__,_|_| |_|_| |_|\___|_|_| |_| |_|\___/|_|\___|";
    echo "                                                       ";
    echo "                                                       ";

    echo ""
    echo "Congrats! tmole is now installed 😃"
    echo "Now what?"
    echo " - Get a random public URL for a local server: \"tmole <port>\" e.g. \"tmole 80\" if your server is running on port 80"
    echo " - Get a customized public URL for a local server: \"tmole 80 as mysite.tunnelmole.com\""
    echo " - Read the docs for more detailed instructions https://tunnelmole.com/docs"
else
    echo ""
    echo "Installation failed. Please email robbie@expose.sh and include your Mac OS X version and copy/paste your terminal output"
    echo ""
fi