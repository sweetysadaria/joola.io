Query is the framework's query processor, it's responsible for returning accurate results in ground-breaking speeds. 
A basic example looks something like this:
```js
//basic query for getting a sum of moves over the last 30 minutes 
joolaio.query.fetch({
  timeframe:'last_30_minutes',
  interval: 'second',
  dimensions: ['timestamp'],
  metrics: ['moves'],
  filter: null
}, function(err, results) {
  if (err)
    throw err;
    
  console.log(results);
});
```