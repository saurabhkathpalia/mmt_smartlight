import os
import click

HOME = os.getenv("HOME")


@click.command()
@click.option('--cronid', help="crontab id")
@click.option('--setting', help="set configure")
@click.option('--time', help="set configure")
def main(cronid, setting, time):
    os.system(f"""
    (crontab -l; echo "{time} /usr/bin/python3 {HOME}/scheduler.py --setting {setting} --cronid {cronid} ")|awk '!x[$0]++'|crontab -
    """)


# pylint: disable=no-value-for-parameter
if __name__ == "__main__":
    main()
