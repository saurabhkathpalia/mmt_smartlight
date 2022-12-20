import json
import click
import requests


@click.command()
@click.option('--cronid', help="crontab id")
@click.option('--setting', help="set configure")
def main(setting, cronid):
    url = "https://mmtiot.azurewebsites.net/led"
    payload = json.dumps(dict(request=setting))
    print(cronid)
    # headers = {'cookie': cookie}
    requests.request("POST", url, data=payload)


# pylint: disable=no-value-for-parameter
if __name__ == "__main__":
    main()
