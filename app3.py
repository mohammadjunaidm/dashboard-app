# This script is for dashboard with port 5003


from flask import Flask, request, jsonify, render_template, url_for, send_from_directory, session, redirect
from flask_cors import CORS
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
from functools import wraps
from datetime import datetime
from datetime import datetime, timezone
import json
import logging
import traceback
import os
import requests
import uuid
import requests
import logging
import urllib.parse
import traceback
import jwt




# Then, define template directory
template_dir = os.path.abspath('C:/Flask/templates')


# Then, create Flask app
app = Flask(__name__, template_folder=template_dir)
app.secret_key = 'your-super-secret-key-12345-67890-09876'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PREFERRED_URL_SCHEME'] = 'https'
CORS(app)
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=1800  # 30 minutes
)

# Auth0 Configuration
AUTH0_CLIENT_ID = 'wrVVZdf7Avpsg8S5AnrCMpmrNaeB7Dhq'
AUTH0_CLIENT_SECRET = 'XD2hB0H-US47Gs7mli_pgnQSkT7Ycv6GsZJJO0UjoHx8smuLPHRmD3iTTUbGQ3yz'
AUTH0_DOMAIN = 'dev-dqfud7cqdl5fv3tm.us.auth0.com'




oauth = OAuth(app)
auth0 = oauth.register(
    'auth0',
    client_id=AUTH0_CLIENT_ID,
    client_secret=AUTH0_CLIENT_SECRET,
    api_base_url=f'https://{AUTH0_DOMAIN}',
    access_token_url=f'https://{AUTH0_DOMAIN}/oauth/token',
    authorize_url=f'https://{AUTH0_DOMAIN}/authorize',
    client_kwargs={
        'scope': 'openid profile email',
        'audience': f'https://{AUTH0_DOMAIN}/userinfo'
    },
    server_metadata_url=f'https://{AUTH0_DOMAIN}/.well-known/openid-configuration'
)
# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ServiceNow Configuration
SERVICENOW_INSTANCE = "dev278567.service-now.com"
SERVICENOW_USER = "admin"
SERVICENOW_PASSWORD = "xH6cF@Bml-4H"


# Google Chat Configuration
GOOGLE_CHAT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAAAYs9cl9I/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=p1k1CtHPjN13dp2ByQi9hWditYfXmGquUJ9nv7-2HZA"


# Slack Configuration
SLACK_WEBHOOK = "https://hooks.slack.com/services/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"




# Ensure the template folder path is correct
template_dir = os.path.abspath('C:/Flask/templates')


def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user' not in session:
            # Clear any existing session data
            session.clear()
            # Store the intended destination
            session['next'] = request.url
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


@app.route("/login")
def login():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return auth0.authorize_redirect(
        redirect_uri=url_for('callback', _external=True, _scheme='https')
    )


@app.route("/callback")
def callback():
    try:
        token = auth0.authorize_access_token()
        resp = auth0.get('userinfo')
        userinfo = resp.json()
        session['jwt_payload'] = userinfo
        session['user'] = {
            'user_id': userinfo['sub'],
            'name': userinfo.get('name', ''),
            'email': userinfo.get('email', ''),
            'picture': userinfo.get('picture', '')
        }
        # Get the next URL from session or default to dashboard
        next_url = session.get('next', url_for('dashboard'))
        # Remove the next URL from session
        session.pop('next', None)
        return redirect(next_url)
    except Exception as e:
        logger.error(f"Error in callback: {str(e)}")
        return redirect(url_for('login'))


@app.route("/logout")
def logout():
    session.clear()
    params = {
        'returnTo': url_for('root', _external=True, _scheme='https'),
        'client_id': AUTH0_CLIENT_ID
    }
    return redirect(auth0.api_base_url + '/v2/logout?' + urllib.parse.urlencode(params))


@app.route('/logout/backchannel', methods=['POST'])
def backchannel_logout():
    # Implement your logout logic here
    # This might include clearing the user's session, revoking tokens, etc.
    logger.info("Back-channel logout request received")
    return '', 200


def get_assignment_group_sys_id(group_name):
    """Fetch sys_id for a given assignment group in ServiceNow."""
    if not group_name:
        logger.warning("No group name provided")
        return None




    try:
        # Ensure group_name is properly encoded
        encoded_group_name = urllib.parse.quote(group_name)
        url = f"https://{SERVICENOW_INSTANCE}/api/now/table/sys_user_group"
       
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
       
        # Updated query syntax for ServiceNow
        params = {
            "sysparm_query": f"name={encoded_group_name}^active=true",  # Added active check
            "sysparm_fields": "sys_id,name",  # Added name for verification
            "sysparm_limit": "1",
            "sysparm_display_value": "true"
        }




        logger.info(f"Fetching assignment group for: {group_name}")
       
        response = requests.get(
            url,
            auth=(SERVICENOW_USER, SERVICENOW_PASSWORD),
            headers=headers,
            params=params,
            timeout=10  # Added timeout
        )




        # Log the full request details for debugging
        logger.debug(f"Request URL: {response.url}")
        logger.debug(f"Request Headers: {headers}")
        logger.debug(f"Response Status: {response.status_code}")
        logger.debug(f"Response Content: {response.text}")




        # Check response status
        if response.status_code != 200:
            logger.error(f"ServiceNow API error: Status {response.status_code}")
            logger.error(f"Response: {response.text}")
            return None




        # Parse response
        try:
            data = response.json()
            result = data.get("result", [])
           
            if not result:
                logger.warning(f"No assignment group found for name: {group_name}")
                return None
           
            sys_id = result[0].get("sys_id")
            if not sys_id:
                logger.warning(f"sys_id not found in response for group: {group_name}")
                return None
           
            # Verify the group name matches
            returned_name = result[0].get("name")
            if returned_name and returned_name.lower() != group_name.lower():
                logger.warning(f"Returned group name '{returned_name}' doesn't match requested name '{group_name}'")
                return None




            logger.info(f"Successfully found sys_id for group '{group_name}': {sys_id}")
            return sys_id




        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Raw response: {response.text}")
            return None
       
        except Exception as e:
            logger.error(f"Error processing response: {str(e)}")
            logger.error(traceback.format_exc())
            return None




    except requests.exceptions.Timeout:
        logger.error(f"Request timed out while fetching assignment group: {group_name}")
        return None
       
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed for assignment group '{group_name}': {str(e)}")
        logger.error(traceback.format_exc())
        return None
       
    except Exception as e:
        logger.error(f"Unexpected error getting assignment group sys_id: {str(e)}")
        logger.error(traceback.format_exc())
        return None




def create_servicenow_incident(incident_data):
    """Create an incident in ServiceNow using REST API"""
    url = f"https://{SERVICENOW_INSTANCE}/api/now/table/incident"
   
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }




    # Get assignment group sys_id if provided
    assignment_group_name = incident_data.get("assignment_group")
    assignment_group_sys_id = None
    if assignment_group_name:
        assignment_group_sys_id = get_assignment_group_sys_id(assignment_group_name)
        logger.info(f"Retrieved sys_id for assignment group {assignment_group_name}: {assignment_group_sys_id}")
   
    # Format the incident data for ServiceNow
    snow_incident = {
        "short_description": incident_data.get("short_description"),
        "description": incident_data.get("description"),
        "caller_id": incident_data.get("caller"),
        "category": incident_data.get("category"),
        "subcategory": incident_data.get("subcategory"),
        "impact": incident_data.get("impact"),
        "urgency": incident_data.get("urgency"),
        "priority": incident_data.get("priority"),
        "state": incident_data.get("state", "1"),  # Default to New state
        "assignment_group": assignment_group_sys_id if assignment_group_sys_id else None
    }
   
    try:
        logger.info(f"Creating incident with data: {json.dumps(snow_incident, indent=2)}")
        response = requests.post(
            url,
            auth=(SERVICENOW_USER, SERVICENOW_PASSWORD),
            headers=headers,
            json=snow_incident
        )
       
        logger.info(f"ServiceNow API response: {response.text}")
       
        if response.status_code == 201:  # Created successfully
            return response.json()["result"]["number"], None
        else:
            return None, f"ServiceNow API Error: {response.status_code} - {response.text}"
           
    except Exception as e:
        logger.error(f"Error creating incident: {str(e)}")
        return None, f"Error creating incident: {str(e)}"
















def send_google_chat_notification(incident_number, incident_data):
    """Send a notification to Google Chat"""
    url = GOOGLE_CHAT_WEBHOOK
   
    message = {
        "cardsV2": [{
            "cardId": "incident-notification",
            "card": {
                "header": {
                    "title": "New Incident Created",
                    "subtitle": f"Incident Number: {incident_number}",
                    "imageUrl": "https://www.servicenow.com/favicon.ico"
                },
                "sections": [{
                    "widgets": [
                        {
                            "decoratedText": {
                                "startIcon": {"knownIcon": "DESCRIPTION"},
                                "text": f"<b>Short Description:</b> {incident_data['short_description']}"
                            }
                        },
                        {
                            "decoratedText": {
                                "startIcon": {"knownIcon": "PERSON"},
                                "text": f"<b>Caller:</b> {incident_data['caller']}"
                            }
                        },
                        {
                            "decoratedText": {
                                "startIcon": {"knownIcon": "BOOKMARK"},
                                "text": f"<b>Priority:</b> {incident_data['priority']}"
                            }
                        },
                        {
                            "buttonList": {
                                "buttons": [{
                                    "text": "View Incident",
                                    "onClick": {
                                        "openLink": {
                                            "url": f"https://{SERVICENOW_INSTANCE}/nav_to.do?uri=incident.do?sys_id={incident_number}"
                                        }
                                    }
                                }]
                            }
                        }
                    ]
                }]
            }
        }]
    }
   
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, headers=headers, data=json.dumps(message))
   
    if response.status_code != 200:
        logger.error(f"Failed to send Google Chat notification. Status: {response.status_code}, Response: {response.text}")
    else:
        logger.info(f"Successfully sent Google Chat notification for incident: {incident_number}")
















def send_slack_notification(incident_number, incident_data):
    """Send a notification to Slack"""
    url = SLACK_WEBHOOK
   
    record_url = f"https://{SERVICENOW_INSTANCE}/nav_to.do?uri=incident.do?sys_id={incident_number}"
   
    assigned_users = [
        { "name": "John", "linear_id": "3a79bbd5-cd43-4592-93d8-13e482aa827f" },
        { "name": "Junaid", "linear_id": "bed27d06-3206-4f55-bb95-ec0e56412850" }
    ]
    payload = {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "@tech-support New incident notification:"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*<{record_url}|INC{incident_number}>*"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Short Description:*\n{incident_data['short_description']}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*State:*\n{incident_data['state']}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Caller:*\n{incident_data['caller']}"
                    }
                ]
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Priority:*\n{incident_data['priority']}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Assignment group:*\n{incident_data['assignment_group']}"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Description:*\n{incident_data['description']}"
                }
            }
        ]
    }
   
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, headers=headers, data=json.dumps(payload))
   
    if response.status_code != 200:
        logger.error(f"Failed to send Slack notification. Status: {response.status_code}, Response: {response.text}")
    else:
        logger.info(f"Successfully sent Slack notification for incident: {incident_number}")






@app.route("/dashboard")
@requires_auth
def dashboard():
    """
    Protected dashboard route that requires authentication
    """
    try:
        logger.info("Serving dashboard")
        user_info = session.get('user', {})
        return render_template(
            "dashboard.html",
            user=user_info
        )
    except Exception as e:
        logger.error(f"Error serving dashboard: {str(e)}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500








@app.route("/submit", methods=["POST"])
def submit_incident():
    """Handle incident form submission"""
    try:
        logger.info(f"Received form data: {request.form}")
       
        # Get form data
        incident_data = {
            "short_description": request.form.get("short_description"),
            "description": request.form.get("description"),
            "caller": request.form.get("caller"),
            "category": request.form.get("category"),
            "subcategory": request.form.get("subcategory"),
            "impact": request.form.get("impact"),
            "urgency": request.form.get("urgency"),
            "priority": request.form.get("priority"),
            "state": request.form.get("state"),
            "assignment_group": request.form.get("assignment_group")
        }
       
        # Handle file upload if present
        if 'file' in request.files:
            file = request.files['file']
            if file.filename != '':
                # Add file handling logic here if needed
                pass
       
        # Create incident in ServiceNow
        incident_number, error = create_servicenow_incident(incident_data)
       
        if error:
            logger.error(f"Error creating ServiceNow incident: {error}")
            return jsonify({
                "success": False,
                "message": "Failed to create incident",
                "error": error
            }), 500
       
        # Send notification to Google Chat
        send_google_chat_notification(incident_number, incident_data)
       
        # Send notification to Slack
        send_slack_notification(incident_number, incident_data)
       
        # Return success response
        return jsonify({
            "success": True,
            "message": f"Incident {incident_number} created successfully",
            "incident_number": incident_number
        }), 200
       
    except Exception as e:
        logger.error(f"Error in submit_incident: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            "success": False,
            "message": "Internal server error",
            "error": str(e)
        }), 500










   


@app.route("/", methods=["GET"])
def root():
    # Clear any existing session data when hitting the root
    session.clear()
    return redirect(url_for('login'))




@app.route("/incident-form", methods=["GET"])
def serve_incident_form():
    """Serves the incident form"""
    try:
        logger.info("Serving incident form")
        return render_template("incident_form.html")
    except Exception as e:
        logger.error(f"Error serving incident form: {str(e)}\n{traceback.format_exc()}")
        return jsonify({"error": "Internal server error"}), 500
















@app.route("/google-chat-webhook", methods=["GET", "POST"])
def google_chat_webhook():
    if request.method == "GET":
        return jsonify({"status": "healthy"}), 200




    try:
        data = request.json
        logger.info(f"Received request: {json.dumps(data, indent=2)}")


        if not data or "message" not in data:
            logger.error("Invalid request format")
            return jsonify({"text": "Invalid request format."}), 400


        message_text = data["message"].get("text", "").lower()
       
        if "@dashboard" in message_text:
            logger.info("@dashboard mention detected")
           
            base_url = request.url_root.rstrip('/')
            dashboard_url = f"{base_url}/dashboard"
           
            response_data = {
                "cardsV2": [{
                    "cardId": "dashboard_card",
                    "card": {
                        "header": {
                            "title": "Servicenow Dashboard",
                            "subtitle": "View incident dashboard"
                        },
                        "sections": [{
                            "widgets": [{
                                "buttonList": {
                                    "buttons": [{
                                        "text": "View Dashboard",
                                        "onClick": {
                                            "openLink": {
                                                "url": dashboard_url
                                            }
                                        }
                                    }
                                   
                                ]
                            }
                        }]
                    }]
                }
            }]
        }
           
            logger.info(f"Sending response: {json.dumps(response_data, indent=2)}")
            return jsonify(response_data), 200




    except Exception as e:
        logger.error(f"Error in webhook: {str(e)}\n{traceback.format_exc()}")
        return jsonify({"text": "I'm here! But encountered an error. Please try again."}), 200




@app.route("/api/incidents")
@requires_auth
def get_incidents():




    assignment_group = request.args.get('assignment_group', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')




    url = f"https://{SERVICENOW_INSTANCE}/api/now/table/incident"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }




    # Build query
    query_parts = []
    if assignment_group:
        query_parts.append(f"assignment_group.name={assignment_group}")




    if date_from:
        query_parts.append(f"sys_created_onGE{date_from}")




    if date_to:
        query_parts.append(f"sys_created_onLE{date_to}")




    base_query = "ORDERBYDESCsys_created_on"
    if query_parts:
        base_query = "^".join(query_parts) + "^" + base_query
   
    params = {
        "sysparm_fields": "number,short_description,sys_created_on,caller_id,state,priority,category,assignment_group,assigned_to,resolved_at",  
        "sysparm_limit": "250",  
        "sysparm_display_value": "true",
        "sysparm_query": base_query
    }




    try:
        response = requests.get(
            url,
            auth=(SERVICENOW_USER, SERVICENOW_PASSWORD),
            headers=headers,
            params=params
        )
       
        if response.status_code == 200:
            incidents = response.json().get('result', [])
            formatted_incidents = []
           
            # Map state numbers to readable values
            state_map = {
                "1": "New",
                "2": "In Progress",
                "3": "On Hold",
                "6": "Resolved",
                "7": "Closed",
                "8": "Canceled"
            }




            # Map priority numbers to readable values
            priority_map = {
                "1": "1 - Critical",
                "2": "2 - High",
                "3": "3 - Moderate",
                "4": "4 - Low",
                "5": "5 - Planning"
            }




       
           
            for incident in incidents:
                try:




                   # Handle caller_id
                    caller = incident.get('caller_id', {})
                    if isinstance(caller, dict):
                      caller = caller.get('display_value', 'Unknown')




                    # Handle assigned_to
                    assigned_to = incident.get('assigned_to', {})
                    if isinstance(assigned_to, dict):
                       assigned_to = assigned_to.get('display_value', 'Unassigned')








                    # Handle assignment_group properly
                    assignment_group = incident.get('assignment_group', {})
                    if isinstance(assignment_group, dict):
                        assignment_group = assignment_group.get('display_value', 'Unassigned')
                    elif isinstance(assignment_group, str):
                        assignment_group = assignment_group or 'Unassigned'
                    else:
                        assignment_group = 'Unassigned'








                    # Handle dates and calculate time spent
                    sys_created_on = incident.get('sys_created_on', '')
                    resolved_at = incident.get('resolved_at', '')




                    # Parse dates
                    created_date = datetime.strptime(sys_created_on, '%Y-%m-%d %H:%M:%S') if sys_created_on else None
                    resolved_date = datetime.strptime(resolved_at, '%Y-%m-%d %H:%M:%S') if resolved_at else None
                   
                     # Calculate time spent
                    if created_date:
                        if resolved_date:
                            time_spent = resolved_date - created_date
                        else:
                            time_spent = datetime.now() - created_date




                    # Format time spent
                        days = time_spent.days
                        hours, remainder = divmod(time_spent.seconds, 3600)
                        minutes, _ = divmod(remainder, 60)
                       
                        time_spent_display = []
                        if days > 0:
                            time_spent_display.append(f"{days}d")
                        if hours > 0:
                            time_spent_display.append(f"{hours}h")
                        if minutes > 0:
                            time_spent_display.append(f"{minutes}m")
                        time_spent_str = ' '.join(time_spent_display) if time_spent_display else '0m'
                    else:
                        time_spent_str = 'Unknown'




                    # Get priority value and map it
                    priority_value = str(incident.get('priority', ''))
                    priority_display = priority_map.get(priority_value, f"{priority_value} - Unknown")




                    formatted_incidents.append({
                        "number": incident.get('number', ''),
                        "short_description": incident.get('short_description', ''),
                        "created_on": sys_created_on,
                        "caller": caller,
                        "assigned_to": assigned_to,
                        "status": state_map.get(incident.get('state', ''), incident.get('state', 'Unknown')),
                        "priority": priority_display,
                        "category": incident.get('category', ''),
                        "assignment_group": assignment_group,
                        "resolved_at": resolved_at if resolved_at else 'Not resolved yet',
                        "time_spent": time_spent_str
                    })
                except Exception as e:
                    logger.error(f"Error formatting incident {incident.get('number', 'unknown')}: {str(e)}")
                    logger.error(f"Raw incident data: {incident}")
                    continue




            # Add debug logging
            logger.debug(f"Formatted {len(formatted_incidents)} incidents")
            logger.debug(f"Sample incident: {formatted_incidents[0] if formatted_incidents else 'No incidents'}")
           
            return jsonify(formatted_incidents)
        else:
            logger.error(f"Failed to fetch incidents. Status: {response.status_code}, Response: {response.text}")
            return jsonify({"error": "Failed to fetch incidents"}), 500
    except Exception as e:
        logger.error(f"Error fetching incidents: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500








def extract_display_value(field):
    """Helper function to extract display value from ServiceNow fields"""
    if isinstance(field, dict):
        return field.get('display_value', '')
    elif isinstance(field, str):
        return field
    return ''








def parse_servicenow_date(date_string):
    if not date_string:
        return None
    return datetime.strptime(date_string, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)








def format_time_spent(time_delta):
    days = time_delta.days
    hours, remainder = divmod(time_delta.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
   
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
   
    return ' '.join(parts) if parts else '0m'








def formatDate(dateString):
    """Format date string to readable format"""
    if not dateString:
        return ''
    try:
        date = datetime.strptime(dateString, '%Y-%m-%d %H:%M:%S')
        return date.strftime('%Y-%m-%d %I:%M %p')
    except Exception:
        return dateString




@app.route("/health", methods=["GET"])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "healthy"}), 200




if __name__ == "__main__":
    logger.info("Starting Flask application...")
    app.run(debug=True, host="0.0.0.0", port=5003)

