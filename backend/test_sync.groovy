import io.jsonwebtoken.Jwts
import io.jsonwebtoken.SignatureAlgorithm
import io.jsonwebtoken.security.Keys
import java.nio.charset.StandardCharsets
import java.util.Date
import java.net.HttpURLConnection
import java.net.URL
import java.io.InputStreamReader
import java.io.BufferedReader

// Secret from application.properties
def secret = "SocialFlowSuperSecretKeyThatIsAtLeast32BytesLong!!"
def key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8))

// We need the user ID. We can get it from the DB using psql or just assume we can get it.
// Actually, it's easier to just login via the API to get the token!

def loginUrl = new URL("http://localhost:8080/api/auth/login")
def connection = (HttpURLConnection) loginUrl.openConnection()
connection.setRequestMethod("POST")
connection.setRequestProperty("Content-Type", "application/json")
connection.setDoOutput(true)

def jsonInputString = '{"email": "hoanghuy@gmail.com", "password": "123456"}'
connection.getOutputStream().write(jsonInputString.getBytes("UTF-8"))

def token = ""
if (connection.getResponseCode() == 200) {
    def reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "utf-8"))
    def response = new StringBuilder()
    def line = null
    while ((line = reader.readLine()) != null) {
        response.append(line.trim())
    }
    // Very simple JSON parsing for token
    def respStr = response.toString()
    def tokenStart = respStr.indexOf('"token":"') + 9
    def tokenEnd = respStr.indexOf('"', tokenStart)
    token = respStr.substring(tokenStart, tokenEnd)
    println "Token: " + token
} else {
    println "Login failed: " + connection.getResponseCode()
    System.exit(1)
}

// Now get brands
def brandsUrl = new URL("http://localhost:8080/api/brands")
def bConn = (HttpURLConnection) brandsUrl.openConnection()
bConn.setRequestMethod("GET")
bConn.setRequestProperty("Authorization", "Bearer " + token)
bConn.setRequestProperty("Accept", "application/json")

def brandsResponse = new StringBuilder()
if (bConn.getResponseCode() == 200) {
    def reader = new BufferedReader(new InputStreamReader(bConn.getInputStream(), "utf-8"))
    def line = null
    while ((line = reader.readLine()) != null) {
        brandsResponse.append(line.trim())
    }
}
def bStr = brandsResponse.toString()
def idStart = bStr.indexOf('"id":"') + 6
def idEnd = bStr.indexOf('"', idStart)
def brandId = bStr.substring(idStart, idEnd)

println "Brand ID: " + brandId

// Hit Sync
def syncUrl = new URL("http://localhost:8080/api/brands/" + brandId + "/inbox/sync")
def sConn = (HttpURLConnection) syncUrl.openConnection()
sConn.setRequestMethod("POST")
sConn.setRequestProperty("Authorization", "Bearer " + token)
sConn.setRequestProperty("Content-Length", "0")

try {
    def code = sConn.getResponseCode()
    println "Sync response code: " + code
    if (code >= 400) {
        def reader = new BufferedReader(new InputStreamReader(sConn.getErrorStream(), "utf-8"))
        def line = null
        while ((line = reader.readLine()) != null) {
            println line
        }
    }
} catch (Exception e) {
    println "Exception calling sync: " + e.getMessage()
    e.printStackTrace()
}
