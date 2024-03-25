import pandas as pd

# 读取Excel文件
file_path = 'data.xlsx'  # Excel文件的路径
df = pd.read_excel(file_path)

# 转换为JSON
# 注意：orient='records'表示列表中的每个项目都是行的记录
json_result = {
    "experiences": df.to_dict(orient='records')
}

# 保存JSON到文件
output_file = 'output.json'  # 输出文件的路径
with open(output_file, 'w', encoding='utf-8') as f:
    pd.json.dump(json_result, f, ensure_ascii=False, indent=4)
