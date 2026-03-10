from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return '<h1>Welcome to IntelliScaleSim!</h1><p>This is a custom application running in a container.</p>'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
