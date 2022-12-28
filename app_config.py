import os

b2c_tenant = os.getenv("B2C_TENANT")
signupsignin_user_flow = os.getenv("SIGNUP")
editprofile_user_flow = os.getenv("EDITPRO")

resetpassword_user_flow = os.getenv("RESETPASS")  # Note: Legacy setting.

authority_template = "https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{user_flow}"

CLIENT_ID = os.getenv("CLIENT_ID")

CLIENT_SECRET = os.getenv("CLIENT_SECRET")

AUTHORITY = authority_template.format(tenant=b2c_tenant,
                                      user_flow=signupsignin_user_flow)
B2C_PROFILE_AUTHORITY = authority_template.format(
    tenant=b2c_tenant, user_flow=editprofile_user_flow)

B2C_RESET_PASSWORD_AUTHORITY = authority_template.format(
    tenant=b2c_tenant, user_flow=resetpassword_user_flow)

REDIRECT_PATH = "/getAToken"
# This is the API resource endpoint
ENDPOINT = 'https://mmtiot.azurewebsites.net'  #
SCOPE = [
    os.getenv("TASK_READ"),
    os.getenv("TASK_WRITE")
    # "https://momagiclight.onmicrosoft.com/momagicb2c/tasks.read",
    # "https://momagiclight.onmicrosoft.com/momagicb2c/tasks.write"
]  # Example with two exposed scopes: ["demo.read", "demo.write"]

SESSION_TYPE = "filesystem"
