from roboflow import Roboflow
rf = Roboflow(api_key="WBhh6jyHHZZ6iU1N2atG")
project = rf.workspace("aadhavs-first-workspace").project("damaged-vs-good-packages")
version = project.version(1)
dataset = version.download("folder")