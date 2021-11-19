# Express Request
req.params 用来存储动态路由的参数值，对于动态路由，比如 /user/:id, 访问的URL 为 /localhost/user/2时，req.params.id 就会为 2
req.query 用来存储 URL 里的 query 参数，比如 /user?name=yang, 那么 req.query.name -> "yang"
req.body 用来存储 key-value pairs of data submitted in request body, 一般来讲，req.body receive data through POST or PUT requests, 比如 app.post('/login', (req, res) => {const name = req.body.name; const password = req.body.password})  
         req.body 默认是 undefined, 在使用 body-parsing middleware 时被解析注入 req.body, 比如 app.use(express.json()), 用来解析 application/json, app.use(express.urlencoded({extended:true})), 用来解析 application/x-www-form-urlencoded

req 还可以获取 URL 里的其它信息, 比如对于 https://ocean.example.com/creatures?filter=sharks
req.protocal -> 'https'
req.hostname -> 'example.com'
req.subdomains -> ['ocean']
req.path -> 'creatures'
req.originalUrl -> 'creatures?filter=sharks'

req 还可以获取当前 HTTP 请求的方法
req.method, 返回 POST,GET,PUT 等

对于放入 req 的 headers,
req.header('Content-Type') -> 'application/json'
req.header('Authorization') -> 'Bearer aejkljklasdg;ka;lsdk'

如果使用了 cookie-parser, 那么它会解析 cookie 信息，然后存在 req.cookies

req.app 可以 hold the reference to the instance of Express application