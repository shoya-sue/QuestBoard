const { Client } = require('@elastic/elasticsearch');

let client = null;

const initElasticsearch = async () => {
  if (!process.env.ELASTICSEARCH_NODE) {
    console.log('Elasticsearch configuration not found, search functionality will be limited');
    return null;
  }

  try {
    client = new Client({
      node: process.env.ELASTICSEARCH_NODE,
      auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    const health = await client.cluster.health();
    console.log('Elasticsearch cluster health:', health.status);

    // Create indices if they don't exist
    await createIndices();

    return client;
  } catch (error) {
    console.error('Failed to initialize Elasticsearch:', error);
    return null;
  }
};

const createIndices = async () => {
  try {
    // Quest index
    const questIndexExists = await client.indices.exists({ index: 'quests' });
    if (!questIndexExists) {
      await client.indices.create({
        index: 'quests',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: {
                type: 'text',
                analyzer: 'kuromoji',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              description: {
                type: 'text',
                analyzer: 'kuromoji'
              },
              category: { type: 'keyword' },
              difficulty: { type: 'keyword' },
              status: { type: 'keyword' },
              reward: { type: 'integer' },
              tags: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              createdBy: { type: 'keyword' },
              completedBy: { type: 'keyword' },
              completedAt: { type: 'date' }
            }
          },
          settings: {
            analysis: {
              analyzer: {
                kuromoji: {
                  type: 'custom',
                  tokenizer: 'kuromoji_tokenizer',
                  filter: ['kuromoji_baseform', 'kuromoji_part_of_speech', 'cjk_width', 'lowercase']
                }
              }
            }
          }
        }
      });
      console.log('Created quests index');
    }

    // User index
    const userIndexExists = await client.indices.exists({ index: 'users' });
    if (!userIndexExists) {
      await client.indices.create({
        index: 'users',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              email: { type: 'keyword' },
              username: {
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              level: { type: 'integer' },
              experience: { type: 'integer' },
              points: { type: 'integer' },
              completedQuests: { type: 'integer' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log('Created users index');
    }
  } catch (error) {
    console.error('Error creating indices:', error);
  }
};

const getClient = () => {
  if (!client) {
    console.warn('Elasticsearch client not initialized');
  }
  return client;
};

module.exports = {
  initElasticsearch,
  getClient
};